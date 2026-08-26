import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OptionalAuthRequest } from '../authenticated-request';
import { paramOf } from './request-params';
import { aAutoriteSurProjet } from './project-authority';

/**
 * Autorise la modification ou la suppression d'un projet : son porteur, le
 * responsable du club auquel il est rattaché, ou un ADMIN.
 *
 * Se combine avec `@Roles(...)`, qui filtre en amont *qui* peut toucher aux
 * projets ; ce garde décide *quels* projets.
 */
@Injectable()
export class ProjectWriteGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    const autorise = await aAutoriteSurProjet(
      this.prisma,
      user,
      paramOf(request, 'id') ?? '',
    );
    if (autorise === null) {
      throw new NotFoundException('Projet non trouvé');
    }
    if (!autorise) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier ce projet.",
      );
    }
    return true;
  }
}
