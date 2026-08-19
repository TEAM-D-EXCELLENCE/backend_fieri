import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PaginatedResponse } from '../../common/pagination';

@Injectable()
export class WorkshopService {
  constructor(private prisma: PrismaService) {}

  async getWorkshops(page?: number, limit?: number) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || undefined;

    const [workshops, total] = await Promise.all([
      this.prisma.workshop.findMany({
        skip,
        take,
        include: {
          registrations: true,
        },
      }),
      this.prisma.workshop.count(),
    ]);

    const data = workshops.map((w) => {
      const registeredCount = w.registrations.filter(
        (r) => r.status === 'REGISTERED',
      ).length;
      const waitlistCount = w.registrations.filter(
        (r) => r.status === 'WAITLISTED',
      ).length;

      return {
        id: w.id,
        title: w.title,
        instructor: w.instructor,
        capacity: w.capacity,
        registeredCount,
        waitlistCount,
      };
    });

    const result: PaginatedResponse<(typeof data)[number]> = {
      success: true,
      data,
    };

    if (page && limit) {
      result.pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }

    return result;
  }

  async registerToWorkshop(
    workshopId: string,
    memberId: number,
    userFullName: string,
  ) {
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
      throw new ConflictException(
        "Vous êtes déjà inscrit ou sur la file d'attente de cet atelier.",
      );
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
    let message = "Inscription confirmée pour l'atelier.";
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
      const oldestWaitlisted = await this.prisma.workshopRegistration.findFirst(
        {
          where: {
            workshopId,
            status: 'WAITLISTED',
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      );

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

  async getWorkshopById(id: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
      include: {
        registrations: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundException('Atelier/Formation non trouvé');
    }

    const registered = workshop.registrations
      .filter((r) => r.status === 'REGISTERED')
      .map((r) => ({
        id: r.member.id,
        firstName: r.member.firstname,
        lastName: r.member.lastname,
      }));

    const waitlisted = workshop.registrations
      .filter((r) => r.status === 'WAITLISTED')
      .map((r) => ({
        id: r.member.id,
        firstName: r.member.firstname,
        lastName: r.member.lastname,
      }));

    return {
      success: true,
      data: {
        id: workshop.id,
        title: workshop.title,
        instructor: workshop.instructor,
        capacity: workshop.capacity,
        registered,
        waitlisted,
      },
    };
  }

  async createWorkshop(data: {
    title: string;
    instructor: string;
    capacity: number;
  }) {
    const workshop = await this.prisma.workshop.create({
      data: {
        id: `work-${Date.now()}`,
        ...data,
      },
    });
    return {
      success: true,
      data: workshop,
    };
  }

  async updateWorkshop(
    id: string,
    data: Partial<{ title: string; instructor: string; capacity: number }>,
  ) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id },
    });
    if (!workshop) {
      throw new NotFoundException('Formation non trouvée');
    }
    const updated = await this.prisma.workshop.update({
      where: { id },
      data,
    });
    return {
      success: true,
      data: updated,
    };
  }

  async registerToWorkshopWaitlist(
    workshopId: string,
    memberId: number,
    userFullName: string,
  ) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new NotFoundException('Formation non trouvée');
    }

    const existing = await this.prisma.workshopRegistration.findUnique({
      where: {
        workshopId_memberId: {
          workshopId,
          memberId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        "Vous êtes déjà inscrit ou sur la file d'attente.",
      );
    }

    const waitlistCount = await this.prisma.workshopRegistration.count({
      where: {
        workshopId,
        status: 'WAITLISTED',
      },
    });
    const position = waitlistCount + 1;

    await this.prisma.workshopRegistration.create({
      data: {
        workshopId,
        memberId,
        userFullName,
        status: 'WAITLISTED',
      },
    });

    return {
      success: true,
      action: 'waitlisted',
      position,
      message: `Placé sur la file d'attente (Position #${position}).`,
    };
  }
}
