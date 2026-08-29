import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SubscribeDto {
  email?: string;
  /** D'où vient l'abonnement : `footer`, `inscription`, `banniere`. */
  source?: string;
}

/** Les seules provenances reconnues. Une valeur inconnue retombe sur `footer`. */
const SOURCES = new Set(['footer', 'inscription', 'banniere']);

/**
 * Validation volontairement simple : une adresse a un `@`, quelque chose
 * avant, un domaine pointé après, et pas d'espace. On refuse ce qui ne peut
 * manifestement pas être une adresse ; on ne prétend pas vérifier qu'elle
 * existe — seul un envoi le dirait.
 */
const ADRESSE = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Abonne une adresse à la lettre d'information.
   *
   * Idempotent, et c'est le point important : quelqu'un qui se réabonne ne
   * doit pas recevoir une erreur de doublon pour avoir cliqué deux fois. Une
   * adresse déjà connue est simplement réactivée, et son désabonnement effacé.
   *
   * `memberId` relie l'abonnement à un compte quand la personne en a un — à
   * l'inscription, par exemple. L'abonnement reste possible sans compte : le
   * formulaire du pied de page est ouvert à tout le monde.
   */
  async subscribe(dto: SubscribeDto, memberId?: number) {
    const email = String(dto.email ?? '')
      .trim()
      .toLowerCase();
    if (!ADRESSE.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide.');
    }
    const source =
      dto.source && SOURCES.has(dto.source) ? dto.source : 'footer';

    const abonne = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, source, memberId: memberId ?? null },
      // La source d'origine est conservée : elle dit où la personne s'est
      // abonnée la première fois, pas la dernière.
      update: { unsubscribedAt: null, ...(memberId ? { memberId } : {}) },
      select: { id: true, email: true, createdAt: true },
    });

    return {
      success: true,
      message: 'Abonnement enregistré.',
      data: abonne,
    };
  }

  /** Désabonnement. La ligne est datée, pas supprimée. */
  async unsubscribe(dto: SubscribeDto) {
    const email = String(dto.email ?? '')
      .trim()
      .toLowerCase();
    if (!ADRESSE.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide.');
    }
    // `updateMany` plutôt que `update` : une adresse inconnue ne doit pas
    // révéler qu'elle est inconnue, ni faire échouer la demande.
    await this.prisma.newsletterSubscriber.updateMany({
      where: { email, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
    return { success: true, message: 'Désabonnement enregistré.' };
  }

  /** La liste des abonnés actifs — ADMIN. C'est par là qu'on les exporte. */
  async list() {
    const abonnes = await this.prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null },
      select: { id: true, email: true, source: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: abonnes, total: abonnes.length };
  }
}
