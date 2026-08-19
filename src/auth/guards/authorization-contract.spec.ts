import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/**
 * Garde-fou d'architecture.
 *
 * Les autorisations de la plateforme sont déclaratives : un garde sur la route,
 * pas un `if` enfoui dans un service. Ce test échoue si ce contrat se défait —
 * décorateur posé sans son garde (l'autorisation serait silencieusement
 * inopérante), ou garde monté sans son décorateur (il refuserait tout).
 *
 * Il lit les sources plutôt que d'instancier Nest : c'est un contrôle de forme,
 * volontairement indépendant de l'exécution.
 */

/** Décorateur ↔ garde qui l'interprète. */
const PAIRS: Array<{ decorator: string; guard: string }> = [
  { decorator: '@ClubFrom(', guard: 'ClubManagerGuard' },
  { decorator: '@ResourceOwner(', guard: 'ResourceOwnerGuard' },
  { decorator: '@EventPosts(', guard: 'EventManagerGuard' },
  { decorator: '@GovernanceOver(', guard: 'MemberGovernanceGuard' },
  { decorator: '@UniversityPosts(', guard: 'UniversityPostGuard' },
  { decorator: '@Roles(', guard: 'RolesGuard' },
];

/** Gardes qui exigent une métadonnée pour savoir quoi vérifier. */
const GUARDS_NEEDING_METADATA: Array<{ guard: string; decorator: string }> =
  PAIRS.filter((p) =>
    [
      'ClubManagerGuard',
      'ResourceOwnerGuard',
      'MemberGovernanceGuard',
      'UniversityPostGuard',
      'RolesGuard',
    ].includes(p.guard),
  ).map(({ guard, decorator }) => ({ guard, decorator }));

const controllers = execSync(
  'find src -name "*.controller.ts" -not -name "*.spec.ts"',
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

/** Découpe un contrôleur en blocs « décorateurs + signature » par route. */
function routeBlocks(file: string): Array<{ line: number; text: string }> {
  const lines = readFileSync(file, 'utf8').split('\n');
  const blocks: Array<{ line: number; text: string }> = [];
  const isVerb = /^\s+@(Get|Post|Put|Patch|Delete)\(/;

  for (let i = 0; i < lines.length; i++) {
    if (!isVerb.test(lines[i])) continue;
    // Remonter jusqu'au début du bloc de décorateurs de CETTE route.
    let start = i;
    while (
      start > 0 &&
      /^\s+@/.test(lines[start - 1].trim() ? lines[start - 1] : '@') &&
      lines[start - 1].trim().startsWith('@')
    ) {
      start--;
    }
    blocks.push({ line: i + 1, text: lines.slice(start, i + 1).join('\n') });
  }
  return blocks;
}

describe('Contrat des autorisations déclaratives', () => {
  it('trouve bien des routes à analyser', () => {
    const total = controllers.reduce((n, f) => n + routeBlocks(f).length, 0);
    expect(controllers.length).toBeGreaterThan(20);
    expect(total).toBeGreaterThan(100);
  });

  it('chaque décorateur d’autorisation est accompagné de son garde', () => {
    const faults: string[] = [];
    for (const file of controllers) {
      for (const block of routeBlocks(file)) {
        for (const { decorator, guard } of PAIRS) {
          if (block.text.includes(decorator) && !block.text.includes(guard)) {
            faults.push(`${file}:${block.line} — ${decorator} sans ${guard}`);
          }
        }
      }
    }
    expect(faults).toEqual([]);
  });

  it('chaque garde paramétrable reçoit la métadonnée qu’il attend', () => {
    const faults: string[] = [];
    for (const file of controllers) {
      for (const block of routeBlocks(file)) {
        for (const { guard, decorator } of GUARDS_NEEDING_METADATA) {
          if (block.text.includes(guard) && !block.text.includes(decorator)) {
            faults.push(`${file}:${block.line} — ${guard} sans ${decorator}`);
          }
        }
      }
    }
    expect(faults).toEqual([]);
  });

  it('aucun service ne réimplémente un contrôle d’autorisation', () => {
    // Seule exception admise : la vérification de signature HMAC du webhook de
    // paiement, qui authentifie un appelant externe et non un membre.
    const ALLOWED = ['src/modules/support/support.service.ts'];
    const hits = execSync(
      'grep -rln "throw new ForbiddenException" src --include="*.service.ts" || true',
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .filter((f) => !ALLOWED.includes(f));
    expect(hits).toEqual([]);
  });
});

/**
 * Séparation lecture / acte à l'échelle d'une université.
 *
 * Le Chef Universitaire supervise : il lit ce que la Secrétaire consolide et
 * ce que le Trésorier tient. Il n'accomplit pas leurs actes à leur place.
 * Ce test fige ce partage route par route, pour qu'un élargissement — ou un
 * rétrécissement — soit un choix explicite et non un effet de bord.
 */
describe('Partage des postes universitaires', () => {
  const ATTENDU: Record<string, string[]> = {
    // Lectures partagées avec le Chef Universitaire.
    'universities/:id/activity-reports': ['SECRETAIRE', 'CHEF_UNIVERSITAIRE'],
    'universities/:id/census-history': ['SECRETAIRE', 'CHEF_UNIVERSITAIRE'],
    ':id/treasury': ['TRESORIER', 'CHEF_UNIVERSITAIRE'],
    // Actes réservés au titulaire du poste.
    'universities/:id/validate-census/:censusId': ['SECRETAIRE'],
    ':id/treasury/transactions': ['TRESORIER'],
  };

  it.each(Object.entries(ATTENDU))(
    'la route %s exige exactement %s',
    (route, postes) => {
      const trouve: string[][] = [];
      for (const file of controllers) {
        for (const block of routeBlocks(file)) {
          if (!block.text.includes(`'${route}'`)) continue;
          const m = /@UniversityPosts\(([^)]*)\)/.exec(block.text);
          trouve.push(
            m
              ? m[1]
                  .split(',')
                  .map((p) => p.trim().replace(/^'|'$/g, ''))
                  .filter(Boolean)
              : [],
          );
        }
      }
      expect(trouve).toHaveLength(1);
      expect(trouve[0].sort()).toEqual([...postes].sort());
    },
  );
});
