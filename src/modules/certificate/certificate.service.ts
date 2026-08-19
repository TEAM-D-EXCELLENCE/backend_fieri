import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../../common/mail/mail.service';
import { PdfService } from '../../common/pdf/pdf.service';

export interface IssueCertificateDto {
  recipientId: number;
  title: string;
  category: string;
}

export interface UploadedSignature {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const CERTIFICATE_CATEGORIES = ['FORMATION', 'MANDAT', 'PROJET'];
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024; // 2 Mo

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
    private pdf: PdfService,
  ) {}

  /**
   * Téléversement par le Chef Universitaire de l'image détourée (PNG
   * transparent) de sa signature manuscrite, enregistrée sur son profil.
   */
  async uploadSignature(memberId: number, file?: UploadedSignature) {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('Aucun fichier de signature fourni.');
    }
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'La signature doit être une image (PNG, JPG, WEBP).',
      );
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      throw new BadRequestException('Image trop volumineuse (max 2 Mo).');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Membre introuvable.');
    }
    const post = await this.prisma.universityPost.findUnique({
      where: { memberId },
    });
    const isChef = post?.post === 'CHEF_UNIVERSITAIRE';
    if (member.role !== 'ADMIN' && !isChef) {
      throw new ForbiddenException(
        'Seul un Chef Universitaire peut enregistrer une signature officielle.',
      );
    }

    const stored = await this.storage.save(file.buffer, {
      subdir: 'signatures',
      filename: `signature-${memberId}.png`,
    });
    await this.prisma.member.update({
      where: { id: memberId },
      data: { signatureUrl: stored.url },
    });

    return { success: true, data: { signatureUrl: stored.url } };
  }

  /**
   * Émission d'une attestation officielle signée : compile un PDF personnalisé
   * avec la signature du Chef apposée, l'enregistre et notifie le bénéficiaire.
   */
  async issueCertificate(
    universityId: number,
    dto: IssueCertificateDto,
    issuerId: number,
  ) {
    const category = (dto.category ?? '').toUpperCase();
    if (!CERTIFICATE_CATEGORIES.includes(category)) {
      throw new BadRequestException(
        `Catégorie invalide. Valeurs autorisées : ${CERTIFICATE_CATEGORIES.join(', ')}.`,
      );
    }
    if (!dto.title?.trim()) {
      throw new BadRequestException('Un intitulé d’attestation est requis.');
    }
    const recipientId = Number(dto.recipientId);
    if (!Number.isInteger(recipientId)) {
      throw new BadRequestException('recipientId invalide.');
    }

    const [issuer, recipient, university] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: issuerId } }),
      this.prisma.member.findUnique({ where: { id: recipientId } }),
      this.prisma.university.findUnique({ where: { id: universityId } }),
    ]);
    if (!issuer) {
      throw new NotFoundException('Émetteur introuvable.');
    }
    if (!recipient) {
      throw new NotFoundException('Bénéficiaire introuvable.');
    }
    if (!university) {
      throw new NotFoundException('Université introuvable.');
    }

    // Auto-fallback pour la signature si non renseignée au profil
    let currentSignatureUrl = issuer.signatureUrl;
    if (!currentSignatureUrl) {
      currentSignatureUrl =
        'https://ui-avatars.com/api/?name=Signature+Officielle&background=0D8ABC&color=fff';
      await this.prisma.member
        .update({
          where: { id: issuerId },
          data: { signatureUrl: currentSignatureUrl },
        })
        .catch(() => null);
    }

    const signatureImage = currentSignatureUrl
      ? ((await this.storage.readByUrl(currentSignatureUrl)) ?? undefined)
      : undefined;
    if (!signatureImage) {
      this.logger.warn(
        `Signature introuvable au stockage pour l'émetteur ${issuerId} — émission sans image.`,
      );
    }

    const recipientName = `${recipient.firstname} ${recipient.lastname}`;
    const issuerName = `${issuer.firstname} ${issuer.lastname}`;
    const issuedAt = new Date();

    // Crée d'abord l'enregistrement pour disposer d'un identifiant unique.
    const certificate = await this.prisma.certificate.create({
      data: {
        recipientId,
        issuerId,
        title: dto.title.trim(),
        category,
        fileUrl: '', // renseigné juste après la génération du PDF
      },
    });

    const pdfBuffer = await this.pdf.generateCertificate({
      recipientName,
      title: dto.title.trim(),
      category,
      certificateId: certificate.id,
      issuerName,
      universityName: university.name,
      issuedAt,
      signatureImage,
    });

    const stored = await this.storage.save(pdfBuffer, {
      subdir: 'certificates',
      filename: `attestation-${certificate.id}.pdf`,
    });

    const updated = await this.prisma.certificate.update({
      where: { id: certificate.id },
      data: { fileUrl: stored.url },
    });

    // Notification in-app au bénéficiaire.
    await this.prisma.notification.create({
      data: {
        memberId: recipientId,
        title: 'Nouvelle attestation disponible',
        message: `Votre attestation « ${dto.title.trim()} » est disponible au téléchargement.`,
      },
    });

    // E-mail avec le PDF en pièce jointe (best-effort).
    const emailed = await this.mail.sendMail({
      to: recipient.email,
      subject: `FIERI — Attestation : ${dto.title.trim()}`,
      text:
        `Bonjour ${recipientName},\n\n` +
        `Votre attestation « ${dto.title.trim()} » vous a été délivrée par ${issuerName} ` +
        `(${university.name}). Vous la trouverez en pièce jointe et sur votre profil.\n\n` +
        `Identifiant du certificat : ${certificate.id}\n\n` +
        `Cordialement,\nL'équipe FIERI`,
      attachments: [
        {
          filename: `attestation-${certificate.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(
      `Attestation ${certificate.id} émise pour le membre ${recipientId} par ${issuerId}, e-mail ${emailed ? 'envoyé' : 'non envoyé'}.`,
    );

    return {
      success: true,
      data: {
        id: updated.id,
        recipientId,
        title: updated.title,
        category: updated.category,
        fileUrl: updated.fileUrl,
        createdAt: updated.createdAt,
        emailed,
      },
    };
  }

  /** Liste des attestations reçues par un membre. */
  async listForMember(memberId: number) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Membre introuvable.');
    }
    const certificates = await this.prisma.certificate.findMany({
      where: { recipientId: memberId },
      orderBy: { createdAt: 'desc' },
      include: {
        issuer: { select: { firstname: true, lastname: true } },
      },
    });
    return {
      success: true,
      data: certificates.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        fileUrl: c.fileUrl,
        issuedBy: `${c.issuer.firstname} ${c.issuer.lastname}`,
        createdAt: c.createdAt,
      })),
    };
  }
}
