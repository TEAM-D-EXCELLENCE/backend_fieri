import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import type { OptionalAuthRequest } from './authenticated-request';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user; // Set by JwtStrategy
    if (!user) {
      return false;
    }

    const member = await this.prisma.member.findUnique({
      where: { id: user.id },
    });

    if (!member || !requiredRoles.includes(member.role)) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits requis pour effectuer cette action.",
      );
    }
    return true;
  }
}
