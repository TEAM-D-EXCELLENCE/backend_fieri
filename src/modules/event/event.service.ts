import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
}
