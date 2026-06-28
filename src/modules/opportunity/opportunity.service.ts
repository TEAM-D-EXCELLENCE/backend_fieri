import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OpportunityService {
  constructor(private prisma: PrismaService) {}

  async getOpportunities(query: { type?: string; domain?: string; status?: string }) {
    const where: any = {};
    if (query.type) {
      where.type = query.type;
    }
    if (query.domain) {
      where.discipline = query.domain; // Discipline correspond au domaine scientifique
    }
    if (query.status) {
      where.status = query.status;
    }

    const opportunities = await this.prisma.opportunity.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: opportunities.map(o => ({
        id: o.id,
        title: o.title,
        description: o.description,
        type: o.type,
        domain: o.discipline,
        salary: o.salary,
        status: o.status,
        createdAt: o.createdAt,
        author: {
          id: o.author.id,
          firstName: o.author.firstname,
          lastName: o.author.lastname,
          email: o.author.email,
        },
      })),
    };
  }

  async getOpportunityById(id: string) {
    const o = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    if (!o) {
      throw new NotFoundException('Opportunité non trouvée');
    }

    return {
      success: true,
      data: {
        id: o.id,
        title: o.title,
        description: o.description,
        type: o.type,
        domain: o.discipline,
        salary: o.salary,
        status: o.status,
        createdAt: o.createdAt,
        author: {
          id: o.author.id,
          firstName: o.author.firstname,
          lastName: o.author.lastname,
          email: o.author.email,
        },
      },
    };
  }

  async createOpportunity(authorId: number, data: { title: string; description: string; type: string; discipline: string; salary?: number }) {
    const o = await this.prisma.opportunity.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        discipline: data.discipline,
        salary: data.salary || null,
        status: 'Active',
        authorId,
      },
    });

    return {
      success: true,
      message: 'Opportunité créée avec succès.',
      data: o,
    };
  }

  async updateOpportunity(
    id: string,
    memberId: number,
    userRole: string,
    data: Partial<{ title: string; description: string; type: string; discipline: string; salary: number; status: string }>,
  ) {
    const o = await this.prisma.opportunity.findUnique({
      where: { id },
    });

    if (!o) {
      throw new NotFoundException('Opportunité non trouvée');
    }

    if (o.authorId !== memberId && userRole !== 'ADMIN') {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette opportunité.");
    }

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        discipline: data.discipline,
        salary: data.salary,
        status: data.status,
      },
    });

    return {
      success: true,
      message: 'Opportunité mise à jour avec succès.',
      data: updated,
    };
  }

  async deleteOpportunity(id: string, memberId: number, userRole: string) {
    const o = await this.prisma.opportunity.findUnique({
      where: { id },
    });

    if (!o) {
      throw new NotFoundException('Opportunité non trouvée');
    }

    if (o.authorId !== memberId && userRole !== 'ADMIN') {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette opportunité.");
    }

    await this.prisma.opportunity.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Opportunité supprimée avec succès.',
    };
  }
}
