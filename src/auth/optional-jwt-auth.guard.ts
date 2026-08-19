import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from './authenticated-request';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Neutralise l'échec d'authentification : la route reste accessible sans
   * token valide, `request.user` vaut alors `null` au lieu de lever un 401.
   */
  handleRequest<TUser = AuthUser>(err: unknown, user: TUser | false): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
