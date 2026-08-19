/**
 * Corps attendu par `POST /auth/register`.
 * Les noms sont en camelCase côté API et sont mappés vers `firstname` /
 * `lastname` en base au moment de la création du membre.
 */
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  branchId: number;
}

/** Corps attendu par `POST /auth/login`. */
export interface LoginDto {
  email: string;
  password: string;
}
