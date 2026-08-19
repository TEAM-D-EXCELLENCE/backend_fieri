import type { Request } from 'express';

/**
 * Lit un paramètre d'URL sous forme de chaîne simple.
 *
 * Express type les paramètres en `string | string[]` (un motif de route peut en
 * capturer plusieurs). Nos routes n'utilisent que des paramètres simples : une
 * valeur multiple est donc une requête malformée, traitée comme absente.
 */
export function paramOf(request: Request, name: string): string | null {
  const value = request.params[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
