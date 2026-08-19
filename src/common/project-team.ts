/**
 * Entrée du champ Json `Project.team`.
 * Voir `prisma/schema.prisma` : `team Json @default("[]") // [{ name, role }]`.
 */
export interface ProjectTeamMember {
  name?: string;
  role?: string;
}

/**
 * Normalise le contenu de `Project.team` en liste exploitable.
 * Le champ est un `Json` Prisma : selon la façon dont il a été écrit, il peut
 * arriver sous forme de chaîne à parser ou de tableau déjà décodé. Toute
 * valeur inattendue (Json invalide, objet non-tableau) donne une liste vide.
 */
export function parseProjectTeam(team: unknown): ProjectTeamMember[] {
  let raw: unknown = team;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (entry): entry is ProjectTeamMember =>
      typeof entry === 'object' && entry !== null,
  );
}
