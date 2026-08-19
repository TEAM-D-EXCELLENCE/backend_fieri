import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OptionalAuthRequest } from '../authenticated-request';
import { paramOf } from './request-params';

/**
 * Réserve l'accès au direct d'un événement à ses inscrits.
 *
 * Contrairement aux autres gardes, aucune dérogation ADMIN : la diffusion
 * sélective est une règle de contenu, pas d'administration.
 */
@Injectable()
export class EventRegistrantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        eventId_memberId: {
          eventId: paramOf(request, 'id') ?? '',
          memberId: user.id,
        },
      },
      select: { id: true },
    });
    if (!registration) {
      throw new ForbiddenException(
        'Vous devez être inscrit à cet événement pour accéder au direct.',
      );
    }
    return true;
  }
}
