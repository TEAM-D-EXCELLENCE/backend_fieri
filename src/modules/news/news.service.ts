import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async getNews(
    includePending?: boolean,
    memberId?: number,
    featured?: boolean,
    page?: number,
    limit?: number,
  ) {
    let whereClause: any = { status: 'APPROVED' };

    if (includePending && memberId) {
      const member = await this.prisma.member.findUnique({
        where: { id: memberId },
      });

      // Seuls les ADMIN et MENTOR (ou modérateurs) peuvent voir les articles en attente
      if (member && (member.role === 'ADMIN' || member.role === 'MENTOR')) {
        whereClause = {};
      }
    }

    if (featured) {
      whereClause.category = { not: null };
    }

    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || undefined;

    const [newsList, total] = await Promise.all([
      this.prisma.news.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          author: {
            select: { id: true, firstname: true, lastname: true },
          },
        },
      }),
      this.prisma.news.count({ where: whereClause }),
    ]);

    const result: any = {
      success: true,
      data: newsList.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        status: n.status,
        category: n.category,
        author: {
          id: n.author.id,
          firstName: n.author.firstname,
          lastName: n.author.lastname,
        },
        createdAt: n.createdAt,
      })),
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

  async getNewsById(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstname: true, lastname: true },
        },
      },
    });

    if (!news) {
      throw new NotFoundException('Article non trouvé');
    }

    return {
      success: true,
      data: {
        id: news.id,
        title: news.title,
        content: news.content,
        status: news.status,
        category: news.category,
        author: {
          id: news.author.id,
          firstName: news.author.firstname,
          lastName: news.author.lastname,
        },
        createdAt: news.createdAt,
      },
    };
  }

  async createNews(
    authorId: number,
    data: { title: string; content: string; category: string },
  ) {
    const news = await this.prisma.news.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        status: 'PENDING',
        authorId,
      },
    });

    return {
      success: true,
      message: 'Article soumis pour relecture.',
      data: {
        id: news.id,
        title: news.title,
        status: news.status,
      },
    };
  }

  async approveNews(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      throw new NotFoundException('Article non trouvé');
    }

    await this.prisma.news.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    // Notify author
    await this.prisma.notification.create({
      data: {
        memberId: news.authorId,
        title: 'Article Approuvé',
        message: `Votre article "${news.title}" a été approuvé et publié.`,
      },
    });

    return {
      success: true,
      message: 'Article approuvé et publié publiquement.',
    };
  }

  async deleteNews(id: string, memberId: number) {
    const news = await this.prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      throw new NotFoundException('Article non trouvé');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new ForbiddenException('Utilisateur non trouvé');
    }

    // L'auteur ou un admin peut supprimer
    if (news.authorId !== memberId && member.role !== 'ADMIN') {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation de supprimer cet article.",
      );
    }

    await this.prisma.news.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Article supprimé.',
    };
  }

  async updateNews(
    id: string,
    memberId: number,
    role: string,
    data: Partial<{ title: string; content: string; category: string }>,
  ) {
    const news = await this.prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      throw new NotFoundException('Article non trouvé');
    }

    if (news.authorId !== memberId && role !== 'ADMIN') {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation de modifier cet article.",
      );
    }

    const updated = await this.prisma.news.update({
      where: { id },
      data,
    });

    return {
      success: true,
      data: updated,
    };
  }
}
