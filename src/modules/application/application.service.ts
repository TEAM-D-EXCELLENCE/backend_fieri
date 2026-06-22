import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApplicationService {
  constructor(private prisma: PrismaService) {}

  async submitApplication(memberId: number, data: { opportunityId: string; coverLetter: string; cvUrl: string }) {
    // Check if already applied
    const existing = await this.prisma.application.findUnique({
      where: {
        opportunityId_memberId: {
          opportunityId: data.opportunityId,
          memberId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Vous avez déjà postulé à cette opportunité.');
    }

    const application = await this.prisma.application.create({
      data: {
        opportunityId: data.opportunityId,
        memberId,
        coverLetter: data.coverLetter,
        cvUrl: data.cvUrl,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Votre candidature a été soumise avec succès.',
      data: {
        id: application.id,
        status: application.status,
      },
    };
  }

  async getMyApplications(memberId: number) {
    const applications = await this.prisma.application.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: applications.map(a => ({
        id: a.id,
        opportunityId: a.opportunityId,
        coverLetter: a.coverLetter,
        cvUrl: a.cvUrl,
        status: a.status,
        createdAt: a.createdAt,
      })),
    };
  }

  async getOpportunityApplications(opportunityId: string) {
    const applications = await this.prisma.application.findMany({
      where: { opportunityId },
      include: {
        member: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: applications.map(a => ({
        id: a.id,
        opportunityId: a.opportunityId,
        status: a.status,
        coverLetter: a.coverLetter,
        cvUrl: a.cvUrl,
        createdAt: a.createdAt,
        user: {
          id: a.member.id,
          firstName: a.member.firstname,
          lastName: a.member.lastname,
          email: a.member.email,
        },
      })),
    };
  }

  async updateApplicationStatus(id: string, status: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Candidature non trouvée');
    }

    await this.prisma.application.update({
      where: { id },
      data: { status },
    });

    // Notify user
    await this.prisma.notification.create({
      data: {
        memberId: application.memberId,
        title: 'Mise à jour de votre Candidature',
        message: `Votre candidature pour l'opportunité "${application.opportunityId}" a été ${status === 'APPROVED' ? 'approuvée' : 'refusée'}.`,
      },
    });

    return {
      success: true,
      message: 'Statut de la candidature mis à jour.',
    };
  }
}
