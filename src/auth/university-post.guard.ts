import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import type { OptionalAuthRequest } from './authenticated-request';
import { UNIVERSITY_POSTS_KEY } from './university-post.decorator';

/**
 * Garde de scope : compare le poste universitaire du membre connecté
 * (`UniversityPost`) à l'université ciblée par la route et aux postes requis
 * par `@UniversityPosts(...)`. Doit être appliquée APRÈS `AuthGuard('jwt')`
 * afin que `request.user` soit renseigné.
 */
@Injectable()
export class UniversityPostGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPosts = this.reflector.getAllAndOverride<string[]>(
      UNIVERSITY_POSTS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPosts || requiredPosts.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: user.id },
    });
    if (!member) {
      throw new ForbiddenException('Membre introuvable.');
    }
    // Un ADMIN global n'est pas contraint par le scope universitaire.
    if (member.role === 'ADMIN') {
      return true;
    }

    const rawId = request.params.universityId ?? request.params.id;
    const universityId = Number(rawId);
    if (!Number.isInteger(universityId)) {
      throw new ForbiddenException("Identifiant d'université invalide.");
    }

    const post = await this.prisma.universityPost.findUnique({
      where: { memberId: user.id },
    });
    if (
      !post ||
      post.universityId !== universityId ||
      !requiredPosts.includes(post.post)
    ) {
      throw new ForbiddenException(
        "Vous n'avez pas le poste requis pour gérer cette université.",
      );
    }
    return true;
  }
}
