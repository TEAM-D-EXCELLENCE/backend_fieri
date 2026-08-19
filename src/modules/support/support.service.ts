import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TreasuryService } from '../treasury/treasury.service';
import { GeniusPayService } from './genius-pay.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../../common/mail/mail.service';
import { PdfService } from '../../common/pdf/pdf.service';

export interface InitiateFinancialDto {
  universityId: number;
  amount: number;
  donorName: string;
  donorEmail: string;
  message?: string;
}

export interface SubmitPhysicalDto {
  donorName: string;
  donorEmail: string;
  physicalType: string;
  description: string;
  universityId?: number;
}

export interface BiometricContext {
  ip: string;
  userAgent: string;
  memberId: number | null;
}

const PHYSICAL_TYPES = ['MATERIEL', 'LOCAUX', 'LOGISTIQUE', 'AUTRE'];

// Types d'évènements considérés comme un règlement réussi côté processeur.
const SUCCESS_EVENTS = [
  'checkout.session.completed',
  'payment.succeeded',
  'payment_success',
];

/**
 * Corps utile d'un webhook Genius Pay. Tous les champs sont optionnels : le
 * format exact dépend du processeur et n'est pas garanti contractuellement,
 * on ne fait donc que du rapprochement défensif.
 */
interface GeniusPayWebhookPayload {
  reference?: string;
  id?: string;
  session_id?: string;
  metadata?: { supportOfferId?: string };
}

/** Enveloppe complète du webhook : le payload peut être imbriqué ou à plat. */
interface GeniusPayWebhookEvent extends GeniusPayWebhookPayload {
  type?: string;
  event?: string;
  data?: GeniusPayWebhookPayload & { object?: GeniusPayWebhookPayload };
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private treasury: TreasuryService,
    private geniusPay: GeniusPayService,
    private storage: StorageService,
    private mail: MailService,
    private pdf: PdfService,
  ) {}

  /**
   * Crée une offre de soutien financière puis une session de paiement hébergée.
   * Renvoie l'URL vers laquelle le frontend redirige le donateur.
   */
  async initiateFinancial(dto: InitiateFinancialDto, memberId: number | null) {
    const universityId = Number(dto.universityId);
    if (!Number.isInteger(universityId)) {
      throw new BadRequestException('universityId invalide.');
    }
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Le montant du don doit être positif.');
    }
    if (!dto.donorName?.trim() || !dto.donorEmail?.trim()) {
      throw new BadRequestException(
        "Le nom et l'e-mail du donateur sont requis.",
      );
    }

    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
    });
    if (!university) {
      throw new NotFoundException('Université bénéficiaire introuvable.');
    }

    const offer = await this.prisma.supportOffer.create({
      data: {
        donorName: dto.donorName.trim(),
        donorEmail: dto.donorEmail.trim(),
        type: 'FINANCIAL',
        financialPlatform: 'GENIUS_PAY',
        amount,
        description:
          dto.message?.trim() ||
          `Don financier de ${dto.donorName.trim()} pour ${university.name}`,
        status: 'PENDING',
        universityId,
        memberId,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const session = await this.geniusPay.createCheckoutSession({
      amount,
      donorName: offer.donorName,
      donorEmail: offer.donorEmail,
      metadata: {
        supportOfferId: offer.id,
        universityId: String(universityId),
      },
      successUrl: `${frontendUrl}/soutien/merci?offer=${offer.id}`,
      cancelUrl: `${frontendUrl}/soutien/annule?offer=${offer.id}`,
    });

    await this.prisma.supportOffer.update({
      where: { id: offer.id },
      data: { paymentReference: session.reference },
    });

    return {
      success: true,
      data: {
        checkoutUrl: session.checkoutUrl,
        supportOfferId: offer.id,
        reference: session.reference,
      },
    };
  }

  /**
   * Traite la notification (webhook) du processeur de paiement :
   *  1. valide la signature cryptographique,
   *  2. rapproche l'offre de soutien,
   *  3. crédite la trésorerie + enregistre un DON + valide l'offre, le tout
   *     dans une unique transaction SQL (idempotente).
   */
  async handlePaymentWebhook(rawBody: Buffer | undefined, signature?: string) {
    if (!rawBody || rawBody.length === 0) {
      this.logger.warn('Webhook reçu sans corps brut exploitable.');
      throw new BadRequestException('Corps de requête manquant.');
    }
    if (!this.geniusPay.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Signature de webhook invalide — requête rejetée.');
      throw new UnauthorizedException('Signature de webhook invalide.');
    }

    let event: GeniusPayWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as GeniusPayWebhookEvent;
    } catch {
      throw new BadRequestException('Payload JSON invalide.');
    }

    const type = event.type ?? event.event ?? '';
    if (!SUCCESS_EVENTS.includes(type)) {
      this.logger.log(`Webhook ignoré (type non pertinent : "${type}").`);
      return { received: true, ignored: true };
    }

    const payload: GeniusPayWebhookPayload =
      event.data?.object ?? event.data ?? event;
    const reference: string | undefined =
      payload.reference ?? payload.id ?? payload.session_id;
    const metadataOfferId: string | undefined =
      payload.metadata?.supportOfferId;

    const orClauses: Array<{ paymentReference: string } | { id: string }> = [];
    if (reference) orClauses.push({ paymentReference: String(reference) });
    if (metadataOfferId) orClauses.push({ id: String(metadataOfferId) });
    if (orClauses.length === 0) {
      this.logger.error('Webhook sans référence ni identifiant exploitable.');
      throw new BadRequestException(
        'Référence de paiement absente du webhook.',
      );
    }

    const offer = await this.prisma.supportOffer.findFirst({
      where: { OR: orClauses },
    });
    if (!offer) {
      this.logger.error(
        `Offre de soutien introuvable (ref=${reference}, id=${metadataOfferId}).`,
      );
      throw new NotFoundException('Offre de soutien introuvable.');
    }

    // Idempotence : un webhook peut être rejoué par le processeur.
    if (offer.status === 'VALIDATED') {
      return {
        received: true,
        alreadyProcessed: true,
        supportOfferId: offer.id,
      };
    }
    if (!offer.universityId || !offer.amount) {
      this.logger.error(
        `Offre ${offer.id} incomplète (universityId/amount manquant).`,
      );
      throw new BadRequestException('Offre de soutien incomplète.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.treasury.incrementBalance(
        tx,
        offer.universityId!,
        offer.amount!,
      );
      await tx.treasuryTransaction.create({
        data: {
          universityId: offer.universityId!,
          type: 'DON',
          amount: offer.amount!,
          label: `Don en ligne — ${offer.donorName}`,
        },
      });
      await tx.supportOffer.update({
        where: { id: offer.id },
        data: { status: 'VALIDATED' },
      });
    });

    this.logger.log(
      `Don validé : offre ${offer.id}, +${offer.amount} crédités à l'université ${offer.universityId}.`,
    );
    return { received: true, validated: true, supportOfferId: offer.id };
  }

  /**
   * Confirmation directe d'un paiement en mode simulation (Mock Genius Pay pour le jury).
   */
  async confirmMockPayment(supportOfferId: string) {
    const offer = await this.prisma.supportOffer.findUnique({
      where: { id: supportOfferId },
    });
    if (!offer) {
      throw new NotFoundException('Offre de soutien introuvable.');
    }
    if (offer.status === 'VALIDATED') {
      return {
        success: true,
        alreadyValidated: true,
        supportOfferId: offer.id,
        amount: offer.amount,
        universityId: offer.universityId,
      };
    }
    if (!offer.universityId || !offer.amount) {
      throw new BadRequestException('Offre de soutien incomplète.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.treasury.incrementBalance(
        tx,
        offer.universityId!,
        offer.amount!,
      );
      await tx.treasuryTransaction.create({
        data: {
          universityId: offer.universityId!,
          type: 'DON',
          amount: offer.amount!,
          label: `Don en ligne (Genius Pay Simulé) — ${offer.donorName}`,
        },
      });
      await tx.supportOffer.update({
        where: { id: offer.id },
        data: { status: 'VALIDATED' },
      });
    });

    this.logger.log(
      `[MOCK Genius Pay] Don validé : offre ${offer.id}, +${offer.amount} FCFA crédités à l'université ${offer.universityId}.`,
    );

    return {
      success: true,
      validated: true,
      supportOfferId: offer.id,
      amount: offer.amount,
      universityId: offer.universityId,
    };
  }

  /**
   * Déclaration d'un soutien physique / matériel (locaux, équipement…).
   * L'offre est créée en attente de signature d'empreinte.
   */
  async submitPhysical(dto: SubmitPhysicalDto, memberId: number | null) {
    if (!dto.donorName?.trim() || !dto.donorEmail?.trim()) {
      throw new BadRequestException(
        "Le nom et l'e-mail du partenaire sont requis.",
      );
    }
    if (!dto.description?.trim()) {
      throw new BadRequestException('Une description de l’offre est requise.');
    }
    const physicalType = (dto.physicalType ?? '').toUpperCase();
    if (!PHYSICAL_TYPES.includes(physicalType)) {
      throw new BadRequestException(
        `Type de soutien physique invalide. Valeurs autorisées : ${PHYSICAL_TYPES.join(', ')}.`,
      );
    }

    let universityId: number | null = null;
    if (dto.universityId !== undefined && dto.universityId !== null) {
      universityId = Number(dto.universityId);
      if (!Number.isInteger(universityId)) {
        throw new BadRequestException('universityId invalide.');
      }
      const university = await this.prisma.university.findUnique({
        where: { id: universityId },
      });
      if (!university) {
        throw new NotFoundException('Université bénéficiaire introuvable.');
      }
    }

    const offer = await this.prisma.supportOffer.create({
      data: {
        donorName: dto.donorName.trim(),
        donorEmail: dto.donorEmail.trim(),
        type: 'PHYSICAL',
        physicalType,
        description: dto.description.trim(),
        status: 'PENDING',
        universityId,
        memberId,
      },
    });

    return {
      success: true,
      data: {
        supportOfferId: offer.id,
        status: offer.status,
        message:
          'Offre enregistrée. Signez par empreinte digitale pour générer l’entente.',
      },
    };
  }

  /**
   * Signature « par scan d'empreinte » d'une offre physique :
   *  1. génère un hash SHA-256 de consentement (offerId + IP + User-Agent + timestamp),
   *  2. compile un PDF d'entente incluant ce hash comme signature officielle,
   *  3. stocke le PDF et l'envoie par e-mail au partenaire.
   */
  async signBiometric(supportOfferId: string, ctx: BiometricContext) {
    const offer = await this.prisma.supportOffer.findUnique({
      where: { id: supportOfferId },
      include: { university: { select: { name: true } } },
    });
    if (!offer) {
      throw new NotFoundException('Offre de soutien introuvable.');
    }
    if (offer.type !== 'PHYSICAL') {
      throw new BadRequestException(
        'Seules les offres physiques se signent par empreinte.',
      );
    }
    if (offer.fingerprintHash) {
      throw new BadRequestException('Cette offre est déjà signée.');
    }

    const signedAt = new Date();
    const fingerprintHash = crypto
      .createHash('sha256')
      .update(
        `${offer.id}|${ctx.ip}|${ctx.userAgent}|${signedAt.toISOString()}`,
      )
      .digest('hex');

    // Compilation de l'entente PDF signée.
    const pdfBuffer = await this.pdf.generateSupportAgreement({
      donorName: offer.donorName,
      donorEmail: offer.donorEmail,
      physicalType: offer.physicalType ?? 'AUTRE',
      description: offer.description,
      universityName: offer.university?.name,
      fingerprintHash,
      signedAt,
    });

    const stored = await this.storage.save(pdfBuffer, {
      subdir: 'support-agreements',
      filename: `entente-${offer.id}.pdf`,
    });

    const updated = await this.prisma.supportOffer.update({
      where: { id: offer.id },
      data: {
        fingerprintHash,
        signatureDocUrl: stored.url,
      },
    });

    const emailed = await this.mail.sendMail({
      to: offer.donorEmail,
      subject: 'FIERI — Votre entente de soutien signée',
      text:
        `Bonjour ${offer.donorName},\n\n` +
        `Merci pour votre soutien. Vous trouverez ci-joint votre entente de soutien, ` +
        `signée numériquement par scan d'empreinte le ${signedAt.toLocaleDateString(
          'fr-FR',
        )}.\n\n` +
        `ID de transaction (SHA-256) : ${fingerprintHash}\n\n` +
        `Cordialement,\nL'équipe FIERI`,
      attachments: [
        {
          filename: `entente-soutien-${offer.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(
      `Offre ${offer.id} signée par empreinte (hash ${fingerprintHash.slice(0, 12)}…), e-mail ${emailed ? 'envoyé' : 'non envoyé'}.`,
    );

    return {
      success: true,
      data: {
        supportOfferId: updated.id,
        fingerprintHash,
        signatureDocUrl: updated.signatureDocUrl,
        signedAt,
        emailed,
      },
    };
  }
}
