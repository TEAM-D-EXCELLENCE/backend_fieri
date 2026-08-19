import { SetMetadata } from '@nestjs/common';

export const GOVERNANCE_MODE_KEY = 'governanceMode';

/**
 * Modes d'autorisation portant sur un membre visé par la route.
 *
 * - `club-responsible`  : responsable d'au moins un club auquel le membre visé
 *                         appartient (déclenchement d'une exclusion).
 * - `university-chief`  : chef de l'université DU MEMBRE VISÉ (validation d'une
 *                         exclusion) — le rattachement est vérifié.
 */
export type GovernanceMode = 'club-responsible' | 'university-chief';

export const GovernanceOver = (mode: GovernanceMode) =>
  SetMetadata(GOVERNANCE_MODE_KEY, mode);
