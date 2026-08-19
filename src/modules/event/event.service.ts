import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';

export interface EventFilters {
  scope?: 'upcoming' | 'past';
  universityId?: number;
  clubId?: string;
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async getEvents(filters: EventFilters = {}) {
    const now = new Date();
    const where: Record<string, any> = {};
    if (filters.scope === 'upcoming') {
      where.date = { gte: now };
    } else if (filters.scope === 'past') {
      where.date = { lt: now };
    }
    if (filters.universityId !== undefined) {
      where.universityId = filters.universityId;
    }
    if (filters.clubId !== undefined) {
      where.clubId = filters.clubId;
    }

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { date: filters.scope === 'past' ? 'desc' : 'asc' },
      include: { _count: { select: { registrations: true } } },
    });

    return {
      success: true,
      data: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.date,
        endDate: e.endDate,
        isLive: e.isLive,
        streamUrl: e.streamUrl,
        clubId: e.clubId,
        universityId: e.universityId,
        isPublished: e.isPublished,
        socialShared: e.socialShared,
        registrationCount: e._count.registrations,
      })),
    };
  }

  /** Historique des événements passés (raccourci de getEvents scope=past). */
  async getHistory(filters: Omit<EventFilters, 'scope'> = {}) {
    return this.getEvents({ ...filters, scope: 'past' });
  }

  async registerToEvent(eventId: string, memberId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    // Check if already registered
    const existing = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Vous êtes déjà inscrit à cet événement.');
    }

    await this.prisma.eventRegistration.create({
      data: {
        eventId,
        memberId,
      },
    });

    // 1. Notification in-app
    await this.prisma.notification.create({
      data: {
        memberId,
        title: 'Inscription Événement',
        message: `Votre inscription pour "${event.title}" a été validée.`,
      },
    });

    // 2. E-mail de confirmation avec invitation agenda (.ics) — best-effort
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { email: true, firstname: true },
    });
    let emailed = false;
    if (member?.email) {
      const ics = this.buildIcs(event);
      emailed = await this.mail.sendMail({
        to: member.email,
        subject: `FIERI — Inscription confirmée : ${event.title}`,
        text:
          `Bonjour ${member.firstname},\n\n` +
          `Votre inscription à « ${event.title} » (le ${event.date.toLocaleString('fr-FR')}) est confirmée.\n` +
          `Ajoutez l'événement à votre agenda avec la pièce jointe.\n\n` +
          `L'équipe FIERI`,
        attachments: [
          {
            filename: `${event.id}.ics`,
            content: Buffer.from(ics, 'utf8'),
            contentType: 'text/calendar',
          },
        ],
      });
    }

    return {
      success: true,
      message: "Inscription validée. Votre ticket d'accès a été généré.",
      emailed,
    };
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }

    const participants = event.registrations.map((r) => ({
      id: r.member.id,
      firstName: r.member.firstname,
      lastName: r.member.lastname,
    }));

    return {
      success: true,
      data: {
        id: event.id,
        title: event.title,
        date: event.date,
        isLive: event.isLive,
        participants,
      },
    };
  }

  async createEvent(
    data: {
      title: string;
      date: string | Date;
      endDate?: string | Date;
      description?: string;
      isLive?: boolean;
      streamUrl?: string;
      clubId?: string;
      universityId?: number;
    },
    organizerId?: number,
  ) {
    if (!data.title?.trim()) {
      throw new BadRequestException('Un titre est requis.');
    }
    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Date invalide.');
    }
    let endDate: Date | null = null;
    if (data.endDate) {
      endDate = new Date(data.endDate);
      if (Number.isNaN(endDate.getTime())) {
        throw new BadRequestException('Date de fin invalide.');
      }
    }

    const event = await this.prisma.event.create({
      data: {
        id: `event-${Date.now()}`,
        title: data.title.trim(),
        description: data.description?.trim() ?? '',
        date,
        endDate,
        isLive: data.isLive || false,
        streamUrl: data.streamUrl || '',
        clubId: data.clubId ?? null,
        universityId: data.universityId ?? null,
        organizerId: organizerId ?? null,
      },
    });
    return {
      success: true,
      data: event,
    };
  }

  async updateEvent(
    id: string,
    data: Partial<{
      title: string;
      date: string | Date;
      isLive: boolean;
      streamUrl: string;
    }>,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }
    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
    return {
      success: true,
      data: updated,
    };
  }

  async deregisterFromEvent(eventId: string, memberId: number) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    await this.prisma.eventRegistration.delete({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    });

    return {
      success: true,
      message: 'Désinscription prise en compte.',
    };
  }

  async getEventStream(eventId: string, memberId: number) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
      include: {
        event: true,
      },
    });

    if (!registration) {
      throw new ForbiddenException(
        'Vous devez être inscrit à cet événement pour accéder au direct.',
      );
    }

    return {
      success: true,
      streamUrl: registration.event.streamUrl,
    };
  }

  /**
   * Vérifie que l'appelant peut gérer l'événement : ADMIN, organisateur,
   * responsable du club porteur, ou détenteur d'un des postes universitaires
   * requis (ex: RESP_COMMUNICATION, CHEF_UNIVERSITAIRE) sur l'université.
   */
  private async assertEventManager(
    event: {
      clubId: string | null;
      universityId: number | null;
      organizerId: number | null;
    },
    requesterId: number,
    posts: string[],
  ) {
    const requester = await this.prisma.member.findUnique({
      where: { id: requesterId },
    });
    if (requester?.role === 'ADMIN') return;
    if (event.organizerId && event.organizerId === requesterId) return;
    if (event.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: event.clubId },
        select: { responsibleId: true },
      });
      if (club?.responsibleId === requesterId) return;
    }
    if (event.universityId) {
      const post = await this.prisma.universityPost.findUnique({
        where: { memberId: requesterId },
      });
      if (
        post &&
        post.universityId === event.universityId &&
        posts.includes(post.post)
      ) {
        return;
      }
    }
    throw new ForbiddenException(
      "Vous n'avez pas les droits pour gérer cet événement.",
    );
  }

  /** Liste des inscrits d'un événement (RESP_COMM / CHEF_UNIV / organisateur). */
  async getRegistrants(eventId: string, requesterId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }
    await this.assertEventManager(event, requesterId, [
      'RESP_COMMUNICATION',
      'CHEF_UNIVERSITAIRE',
    ]);

    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        member: {
          select: { id: true, firstname: true, lastname: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: {
        eventId,
        title: event.title,
        count: registrations.length,
        registrants: registrations.map((r) => ({
          memberId: r.member.id,
          name: `${r.member.firstname} ${r.member.lastname}`,
          email: r.member.email,
          attended: r.attended,
          registeredAt: r.createdAt,
        })),
      },
    };
  }

  /** Renseigne les présences effectives (organisateur / responsable / chef). */
  async markAttendance(
    eventId: string,
    memberIds: number[],
    requesterId: number,
  ) {
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new BadRequestException(
        'Fournissez la liste des memberIds présents.',
      );
    }
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }
    await this.assertEventManager(event, requesterId, [
      'RESP_COMMUNICATION',
      'CHEF_UNIVERSITAIRE',
    ]);

    const result = await this.prisma.eventRegistration.updateMany({
      where: { eventId, memberId: { in: memberIds } },
      data: { attended: true },
    });

    return {
      success: true,
      data: { eventId, marked: result.count },
    };
  }

  /**
   * Publication de l'événement sur les réseaux sociaux (RESP_COMM / CHEF).
   * NOTE : l'intégration OAuth réelle (YouTube/LinkedIn/Meta) est mockée pour
   * l'instant — on marque l'événement comme publié et on renvoie les
   * plateformes connectées vers lesquelles la diffusion serait effectuée.
   */
  async publishSocial(eventId: string, requesterId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }
    await this.assertEventManager(event, requesterId, [
      'RESP_COMMUNICATION',
      'CHEF_UNIVERSITAIRE',
    ]);

    const accounts = event.universityId
      ? await this.prisma.socialAccount.findMany({
          where: { universityId: event.universityId },
          select: { platform: true },
        })
      : [];
    const platforms = accounts.map((a) => a.platform);

    await this.prisma.event.update({
      where: { id: eventId },
      data: { isPublished: true, socialShared: true },
    });

    this.logger.log(
      `Événement ${eventId} marqué publié — plateformes connectées : ${
        platforms.join(', ') || 'aucune'
      } (publication OAuth mockée).`,
    );

    return {
      success: true,
      data: {
        eventId,
        published: true,
        platforms,
        mocked: true,
        message:
          platforms.length > 0
            ? `Diffusion simulée vers : ${platforms.join(', ')}.`
            : 'Aucun compte social connecté — événement marqué comme publié.',
      },
    };
  }

  // ── Génération d'invitation agenda (.ics) ─────────────────────────
  private formatIcsDate(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  }

  private escapeIcs(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  private buildIcs(event: {
    id: string;
    title: string;
    description: string;
    date: Date;
    endDate: Date | null;
  }): string {
    const start = event.date;
    const end = event.endDate ?? new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h par défaut
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FIERI//Events//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@fieri`,
      `DTSTAMP:${this.formatIcsDate(new Date())}`,
      `DTSTART:${this.formatIcsDate(start)}`,
      `DTEND:${this.formatIcsDate(end)}`,
      `SUMMARY:${this.escapeIcs(event.title)}`,
      `DESCRIPTION:${this.escapeIcs(event.description || '')}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}
