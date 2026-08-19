import type { Request } from 'express';

/**
 * Principal injecté dans `request.user` par `JwtStrategy.validate()`.
 * `id` est un entier : c'est la clé primaire auto-incrémentée de `Member`.
 */
export interface AuthUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
}

/** Contenu du JWT signé à l'authentification (`sub` = id du membre). */
export interface JwtPayload {
  sub: number;
  email?: string;
}

/**
 * Requête protégée par `AuthGuard('jwt')` : le guard rejette la requête (401)
 * avant d'atteindre le handler, donc `user` est toujours renseigné ici.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/**
 * Requête passée par `OptionalJwtAuthGuard` : la route reste accessible sans
 * token, `user` est donc absent pour un visiteur anonyme.
 */
export interface OptionalAuthRequest extends Request {
  user?: AuthUser;
}
