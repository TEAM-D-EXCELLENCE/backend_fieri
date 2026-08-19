import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OptionalAuthRequest } from '../authenticated-request';

/**
 * Autorise tout détenteur du poste de Chef Universitaire, quelle que soit son
 * université — ainsi que les ADMIN.
 *
 * À distinguer de `UniversityPostGuard`, qui exige en plus que le poste porte
 * sur l'université visée par la route. Ce garde-ci sert aux actions qu'un chef
 * accomplit pour lui-même (déposer sa signature officielle) ou à l'échelle de
 * la communauté (statut de figure emblématique).
 */
@Injectable()
export class UniversityChiefGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    if (user.role === 'ADMIN') {
      return true;
    }
    const post = await this.prisma.universityPost.findUnique({
      where: { memberId: user.id },
      select: { post: true },
    });
    if (post?.post === 'CHEF_UNIVERSITAIRE') {
      return true;
    }
    throw new ForbiddenException(
      'Action réservée aux Chefs Universitaires et Administrateurs.',
    );
  }
}
