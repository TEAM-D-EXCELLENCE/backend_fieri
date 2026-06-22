import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkshopService {
  constructor(private prisma: PrismaService) {}

  async getWorkshops() {
    const workshops = await this.prisma.workshop.findMany({
      include: {
        registrations: true,
      },
    });

    const data = workshops.map(w => {
      const registeredCount = w.registrations.filter(r => r.status === 'REGISTERED').length;
      const waitlistCount = w.registrations.filter(r => r.status === 'WAITLISTED').length;

      return {
        id: w.id,
        title: w.title,
        instructor: w.instructor,
        capacity: w.capacity,
        registeredCount,
        waitlistCount,
      };
    });

    return {
      success: true,
      data,
    };
  }

  async registerToWorkshop(workshopId: string, memberId: number, userFullName: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new NotFoundException('Atelier non trouvé');
    }

    // Check if already registered
    const existing = await this.prisma.workshopRegistration.findUnique({
      where: {
        workshopId_memberId: {
          workshopId,
          memberId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Vous êtes déjà inscrit ou sur la file d\'attente de cet atelier.');
    }

    // Get counts
    const registeredCount = await this.prisma.workshopRegistration.count({
      where: {
        workshopId,
        status: 'REGISTERED',
      },
    });

    let status = 'REGISTERED';
    let action = 'registered';
    let message = 'Inscription confirmée pour l\'atelier.';
    let position = 0;

    if (registeredCount >= workshop.capacity) {
      status = 'WAITLISTED';
      action = 'waitlisted';
      // Calculate position
      const waitlistCount = await this.prisma.workshopRegistration.count({
        where: {
          workshopId,
          status: 'WAITLISTED',
        },
      });
      position = waitlistCount + 1;
      message = `Placé sur la file d'attente (Position #${position}).`;
    }

    await this.prisma.workshopRegistration.create({
      data: {
        workshopId,
        memberId,
        userFullName,
        status,
      },
    });

    return {
      success: true,
      action,
      ...(position > 0 ? { position } : {}),
      message,
    };
  }

  async deregisterFromWorkshop(workshopId: string, memberId: number) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new NotFoundException('Atelier non trouvé');
    }

    const registration = await this.prisma.workshopRegistration.findUnique({
      where: {
        workshopId_memberId: {
          workshopId,
          memberId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    // Delete registration
    await this.prisma.workshopRegistration.delete({
      where: {
        workshopId_memberId: {
          workshopId,
          memberId,
        },
      },
    });

    // If the deleted registration was registered, promote the first person on waitlist
    if (registration.status === 'REGISTERED') {
      const oldestWaitlisted = await this.prisma.workshopRegistration.findFirst({
        where: {
          workshopId,
          status: 'WAITLISTED',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (oldestWaitlisted) {
        await this.prisma.workshopRegistration.update({
          where: { id: oldestWaitlisted.id },
          data: { status: 'REGISTERED' },
        });

        // Create a notification for the promoted member
        await this.prisma.notification.create({
          data: {
            memberId: oldestWaitlisted.memberId,
            title: 'Inscription Validée',
            message: `Votre place pour l'atelier "${workshop.title}" est confirmée.`,
          },
        });
      }
    }

    return {
      success: true,
      message: 'Désinscription prise en compte.',
    };
  }
}
