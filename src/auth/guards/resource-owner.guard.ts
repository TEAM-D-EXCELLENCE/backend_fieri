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
import {
  RESOURCE_OWNER_KEY,
  type OwnedResource,
  type ResourceOwnerSource,
} from './resource-owner.decorator';
import { paramOf } from './request-params';

/**
 * Autorise le propriétaire de la ressource visée — son auteur pour un article
 * ou une opportunité, son destinataire pour une notification — et, sauf
 * mention contraire, un ADMIN global.
 *
 * Complète les gardes de rôle : `@Roles('CHERCHEUR')` dit *qui peut écrire des
 * articles*, ce garde dit *lequel de ses articles*.
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const source = this.reflector.getAllAndOverride<ResourceOwnerSource>(
      RESOURCE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!source) {
      throw new ForbiddenException(
        'Ressource cible non déterminée pour cette route.',
      );
    }

    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    if (source.adminBypass !== false && user.role === 'ADMIN') {
      return true;
    }

    const id = paramOf(request, source.param ?? 'id');
    if (!id) {
      throw new NotFoundException('Ressource introuvable.');
    }

    const ownerId = await this.findOwnerId(source.resource, id);
    if (ownerId === null) {
      throw new NotFoundException('Ressource introuvable.');
    }
    if (ownerId !== user.id) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à agir sur cette ressource.",
      );
    }
    return true;
  }

  /**
   * Renvoie l'identifiant du propriétaire, ou `null` si la ressource n'existe
   * pas. Le `switch` est volontairement explicite : un accès dynamique au
   * client Prisma perdrait le typage sur des règles d'autorisation, là où il
   * doit précisément rester vérifiable.
   */
  private async findOwnerId(
    resource: OwnedResource,
    id: string,
  ): Promise<number | null> {
    switch (resource) {
      case 'news': {
        const row = await this.prisma.news.findUnique({
          where: { id },
          select: { authorId: true },
        });
        return row?.authorId ?? null;
      }
      case 'opportunity': {
        const row = await this.prisma.opportunity.findUnique({
          where: { id },
          select: { authorId: true },
        });
        return row?.authorId ?? null;
      }
      case 'notification': {
        const row = await this.prisma.notification.findUnique({
          where: { id },
          select: { memberId: true },
        });
        return row?.memberId ?? null;
      }
    }
  }
}
