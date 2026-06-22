import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async getNews(includePending?: boolean, memberId?: number) {
    let whereClause: any = { status: 'APPROVED' };

    if (includePending && memberId) {
      const member = await this.prisma.member.findUnique({
        where: { id: memberId },
      });

      // Seuls les ADMIN et MENTOR (ou modérateurs) peuvent voir les articles en attente
      if (member && (member.role === 'ADMIN' || member.role === 'MENTOR')) {
        whereClause = {}; // Tout récupérer
      }
    }

    const newsList = await this.prisma.news.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: newsList.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        status: n.status,
        category: n.category,
      })),
    };
  }

  async getNewsById(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
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
      },
    };
  }

  async createNews(authorId: number, data: { title: string; content: string; category: string }) {
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
      throw new ForbiddenException("Vous n'avez pas l'autorisation de supprimer cet article.");
    }

    await this.prisma.news.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Article supprimé.',
    };
  }
}
