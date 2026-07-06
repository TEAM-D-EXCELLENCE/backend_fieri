import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
    const whereClause: any = {};

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

    const result: any = {
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

    // team est un Json. On le caste en any[] ou array pour la réponse
    let teamArray: any[] = [];
    try {
      if (project.team && typeof project.team === 'string') {
        teamArray = JSON.parse(project.team);
      } else if (Array.isArray(project.team)) {
        teamArray = project.team;
      }
    } catch (e) {
      teamArray = [];
    }

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

    if (project.ownerId !== memberId && userRole !== 'ADMIN') {
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

    if (project.ownerId !== memberId && userRole !== 'ADMIN') {
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

  async toggleFollowProject(id: string, memberId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const existingFollow = await this.prisma.projectFollow.findUnique({
      where: {
        memberId_projectId: {
          memberId,
          projectId: id,
        },
      },
    });

    let starred = false;
    let message = '';

    if (existingFollow) {
      // Unfollow
      await this.prisma.projectFollow.delete({
        where: {
          memberId_projectId: {
            memberId,
            projectId: id,
          },
        },
      });

      await this.prisma.project.update({
        where: { id },
        data: { stars: { decrement: 1 } },
      });

      starred = false;
      message = 'Projet retiré des favoris.';
    } else {
      // Follow
      await this.prisma.projectFollow.create({
        data: {
          memberId,
          projectId: id,
        },
      });

      await this.prisma.project.update({
        where: { id },
        data: { stars: { increment: 1 } },
      });

      starred = true;
      message = 'Projet ajouté aux favoris.';
    }

    return {
      success: true,
      starred,
      message,
    };
  }

  async unfollowProject(id: string, memberId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const existingFollow = await this.prisma.projectFollow.findUnique({
      where: {
        memberId_projectId: {
          memberId,
          projectId: id,
        },
      },
    });

    if (!existingFollow) {
      return {
        success: true,
        message: 'Vous ne suivez pas ce projet.',
      };
    }

    await this.prisma.projectFollow.delete({
      where: {
        memberId_projectId: {
          memberId,
          projectId: id,
        },
      },
    });

    await this.prisma.project.update({
      where: { id },
      data: { stars: { decrement: 1 } },
    });

    return {
      success: true,
      message: 'Désabonnement réussi.',
    };
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
