import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async getEvents() {
    const events = await this.prisma.event.findMany({
      orderBy: { date: 'asc' },
    });

    return {
      success: true,
      data: events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        isLive: e.isLive,
        streamUrl: e.streamUrl,
      })),
    };
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

    // Create a notification
    await this.prisma.notification.create({
      data: {
        memberId,
        title: 'Inscription Événement',
        message: `Votre inscription pour "${event.title}" a été validée.`,
      },
    });

    return {
      success: true,
      message: "Inscription validée. Votre ticket d'accès a été généré.",
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

    const participants = event.registrations.map(r => ({
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

  async createEvent(data: { id: string; title: string; date: string | Date; isLive?: boolean; streamUrl: string }) {
    const existing = await this.prisma.event.findUnique({
      where: { id: data.id },
    });
    if (existing) {
      throw new ConflictException('Un événement avec cet identifiant existe déjà');
    }
    const event = await this.prisma.event.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
    });
    return {
      success: true,
      data: event,
    };
  }

  async updateEvent(id: string, data: Partial<{ title: string; date: string | Date; isLive: boolean; streamUrl: string }>) {
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
      throw new ForbiddenException('Vous devez être inscrit à cet événement pour accéder au direct.');
    }

    return {
      success: true,
      streamUrl: registration.event.streamUrl,
    };
  }
}

