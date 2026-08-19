import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import type { OptionalAuthRequest } from '../authenticated-request';
import { EVENT_POSTS_KEY } from './event-manager.decorator';
import { paramOf } from './request-params';

/**
 * Autorise la gestion d'un événement. Quatre voies mènent à l'accès, dans
 * l'ordre du moins coûteux au plus coûteux à vérifier :
 * ADMIN, organisateur de l'événement, responsable du club porteur, ou
 * détenteur d'un des postes déclarés par `@EventPosts(...)` sur l'université
 * organisatrice.
 */
@Injectable()
export class EventManagerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const posts =
      this.reflector.getAllAndOverride<string[]>(EVENT_POSTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    if (user.role === 'ADMIN') {
      return true;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: paramOf(request, 'id') ?? '' },
      select: { organizerId: true, clubId: true, universityId: true },
    });
    if (!event) {
      throw new NotFoundException('Événement non trouvé');
    }
    if (event.organizerId && event.organizerId === user.id) {
      return true;
    }
    if (event.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: event.clubId },
        select: { responsibleId: true },
      });
      if (club?.responsibleId === user.id) {
        return true;
      }
    }
    if (event.universityId && posts.length > 0) {
      const post = await this.prisma.universityPost.findUnique({
        where: { memberId: user.id },
        select: { post: true, universityId: true },
      });
      if (
        post &&
        post.universityId === event.universityId &&
        posts.includes(post.post)
      ) {
        return true;
      }
    }
    throw new ForbiddenException(
      "Vous n'avez pas les droits pour gérer cet événement.",
    );
  }
}
