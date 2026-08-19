import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { PaginatedResponse } from '../../common/pagination';
import { parseProjectTeam } from '../../common/project-team';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async getProjects(
    memberId?: number,
    clubId?: string,
    status?: string,
    search?: string,
    page?: number,
    limit?: number,
  ) {
    const whereClause: Prisma.ProjectWhereInput = {};

    if (clubId) {
      whereClause.clubId = clubId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || undefined;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.project.count({ where: whereClause }),
    ]);

    let starredProjectIds = new Set<string>();
    if (memberId) {
      const follows = await this.prisma.projectFollow.findMany({
        where: { memberId },
      });
      starredProjectIds = new Set(follows.map((f) => f.projectId));
    }

    const formattedProjects = projects.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      status: p.status,
      clubId: p.clubId,
      stars: p.stars,
      starred: starredProjectIds.has(p.id),
      budgetRaised: p.budgetRaised,
      technologies: p.technologies,
    }));

    const result: PaginatedResponse<(typeof formattedProjects)[number]> = {
      success: true,
      data: formattedProjects,
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

  async getProjectById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const teamArray = parseProjectTeam(project.team);

    return {
      success: true,
      data: {
        id: project.id,
        title: project.title,
        description: project.description || project.summary,
        team: teamArray,
        stars: project.stars,
        budgetRaised: project.budgetRaised,
        ownerId: project.ownerId,
      },
    };
  }

  async createProject(
    memberId: number,
    data: {
      title: string;
      summary: string;
      description?: string;
      status?: string;
      technologies?: string[];
      team?: any[];
      clubId?: string;
    },
  ) {
    if (data.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: data.clubId },
      });
      if (!club) {
        throw new NotFoundException('Club introuvable.');
      }
      const requester = await this.prisma.member.findUnique({
        where: { id: memberId },
      });
      const isAdmin = requester?.role === 'ADMIN';
      const isResponsible = club.responsibleId === memberId;
      const membership = await this.prisma.clubMembership.findUnique({
        where: { clubId_memberId: { clubId: data.clubId, memberId } },
      });
      const isMember = membership?.status === 'APPROVED';

      if (!isAdmin && !isResponsible && !isMember) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à créer un projet rattaché à ce club.",
        );
      }
    }

    const project = await this.prisma.project.create({
      data: {
        id: `proj-${Date.now()}`,
        title: data.title,
        summary: data.summary,
        description: data.description || null,
        status: data.status || 'Actif',
        technologies: data.technologies || [],
        team: data.team ? JSON.stringify(data.team) : '[]',
        clubId: data.clubId || null,
        ownerId: memberId,
      },
    });

    return {
      success: true,
      message: 'Projet créé avec succès.',
      data: project,
    };
  }

  async updateProject(
    id: string,
    memberId: number,
    userRole: string,
    data: Partial<{
      title: string;
      summary: string;
      description: string;
      status: string;
      technologies: string[];
      team: any[];
      clubId: string;
    }>,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const isOwner = project.ownerId === memberId;
    const isAdmin = userRole === 'ADMIN';
    let isClubResponsible = false;
    if (project.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: project.clubId },
      });
      if (club && club.responsibleId === memberId) {
        isClubResponsible = true;
      }
    }

    if (!isOwner && !isAdmin && !isClubResponsible) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier ce projet.",
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        title: data.title,
        summary: data.summary,
        description: data.description,
        status: data.status,
        technologies: data.technologies,
        team: data.team ? JSON.stringify(data.team) : undefined,
        clubId: data.clubId,
      },
    });

    return {
      success: true,
      message: 'Projet mis à jour avec succès.',
      data: updated,
    };
  }

  async deleteProject(id: string, memberId: number, userRole: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const isOwner = project.ownerId === memberId;
    const isAdmin = userRole === 'ADMIN';
    let isClubResponsible = false;
    if (project.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: project.clubId },
      });
      if (club && club.responsibleId === memberId) {
        isClubResponsible = true;
      }
    }

    if (!isOwner && !isAdmin && !isClubResponsible) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer ce projet.",
      );
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Projet supprimé avec succès.',
    };
  }

  /**
   * Suivi d'un projet (idempotent). Le compteur `stars` est RECALCULÉ à partir
   * du nombre réel d'abonnés dans la même transaction : suivre deux fois
   * n'incrémente jamais deux fois, et le compteur ne peut pas dériver.
   */
  async followProject(id: string, memberId: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }
    const existingFollow = await this.prisma.projectFollow.findUnique({
      where: { memberId_projectId: { memberId, projectId: id } },
    });
    if (existingFollow) {
      return {
        success: true,
        starred: true,
        stars: project.stars,
        message: 'Vous suivez déjà ce projet.',
      };
    }
    const stars = await this.prisma.$transaction(async (tx) => {
      await tx.projectFollow.create({ data: { memberId, projectId: id } });
      const count = await tx.projectFollow.count({ where: { projectId: id } });
      await tx.project.update({ where: { id }, data: { stars: count } });
      return count;
    });
    return {
      success: true,
      starred: true,
      stars,
      message: 'Projet ajouté aux favoris.',
    };
  }

  /** Désabonnement d'un projet (idempotent, compteur recalculé, jamais négatif). */
  async unfollowProject(id: string, memberId: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }
    const existingFollow = await this.prisma.projectFollow.findUnique({
      where: { memberId_projectId: { memberId, projectId: id } },
    });
    if (!existingFollow) {
      return {
        success: true,
        starred: false,
        stars: project.stars,
        message: 'Vous ne suivez pas ce projet.',
      };
    }
    const stars = await this.prisma.$transaction(async (tx) => {
      await tx.projectFollow.delete({
        where: { memberId_projectId: { memberId, projectId: id } },
      });
      const count = await tx.projectFollow.count({ where: { projectId: id } });
      await tx.project.update({ where: { id }, data: { stars: count } });
      return count;
    });
    return {
      success: true,
      starred: false,
      stars,
      message: 'Désabonnement réussi.',
    };
  }

  /** Bascule suivi/non-suivi ; délègue aux méthodes idempotentes ci-dessus. */
  async toggleFollowProject(id: string, memberId: number) {
    const existingFollow = await this.prisma.projectFollow.findUnique({
      where: { memberId_projectId: { memberId, projectId: id } },
    });
    return existingFollow
      ? this.unfollowProject(id, memberId)
      : this.followProject(id, memberId);
  }

  async supportProject(
    id: string,
    memberId: number,
    amount: number,
    message?: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    await this.prisma.projectContribution.create({
      data: {
        projectId: id,
        memberId,
        amount,
        message,
      },
    });

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: { budgetRaised: { increment: amount } },
    });

    return {
      success: true,
      message: 'Contribution enregistrée.',
      newBudget: updatedProject.budgetRaised,
    };
  }
}
