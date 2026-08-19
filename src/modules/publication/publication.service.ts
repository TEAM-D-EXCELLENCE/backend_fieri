import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PublicationService {
  constructor(private prisma: PrismaService) {}

  async getPublications(params: {
    authorId?: number;
    clubId?: string;
    projectId?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.PublicationWhereInput = { status: 'PUBLISHED' };

    if (params.authorId) {
      where.authorId = params.authorId;
    }
    if (params.clubId) {
      where.clubId = params.clubId;
    }
    if (params.projectId) {
      where.projectId = params.projectId;
    }

    const skip = (params.page - 1) * params.limit;

    const [publications, total] = await Promise.all([
      this.prisma.publication.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, firstname: true, lastname: true },
          },
        },
      }),
      this.prisma.publication.count({ where }),
    ]);

    return {
      success: true,
      data: publications.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        category: p.category,
        author: {
          id: p.author.id,
          firstName: p.author.firstname,
          lastName: p.author.lastname,
        },
        projectId: p.projectId,
        clubId: p.clubId,
        createdAt: p.createdAt,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async getPublicationById(id: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstname: true, lastname: true, email: true },
        },
      },
    });

    if (!publication) {
      throw new NotFoundException('Publication non trouvée');
    }

    return {
      success: true,
      data: {
        id: publication.id,
        title: publication.title,
        content: publication.content,
        category: publication.category,
        status: publication.status,
        author: {
          id: publication.author.id,
          firstName: publication.author.firstname,
          lastName: publication.author.lastname,
        },
        projectId: publication.projectId,
        clubId: publication.clubId,
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,
      },
    };
  }

  async createPublication(
    authorId: number,
    data: {
      title: string;
      content: string;
      category: string;
      projectId?: string;
      clubId?: string;
    },
  ) {
    const publication = await this.prisma.publication.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        authorId,
        projectId: data.projectId || null,
        clubId: data.clubId || null,
      },
    });

    return {
      success: true,
      message: 'Publication créée avec succès.',
      data: {
        id: publication.id,
        title: publication.title,
        status: publication.status,
      },
    };
  }
}
