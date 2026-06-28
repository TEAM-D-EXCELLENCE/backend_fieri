---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 2.4: Progressive Skeleton Loading

Status: review

## Story

En tant que **utilisateur avec une connexion fluctuante**,
Je veux **voir des squelettes de chargement translucides et animés en pulsation d'opacité à la place des loaders ou spinners classiques pendant le chargement des profils ou de l'annuaire**,
Afin de **percevoir un chargement fluide, harmonieux et anticiper la structure finale de la page**.

## Acceptance Criteria

1. **Given** une requête de chargement de données vers l'annuaire (`/members`) ou le profil chercheur (`/profile/:id`).
2. **When** la page est en attente de réponse (état `isLoading`).
3. **Then** les cartes réelles sont temporairement remplacées par des boîtes grises translucides (Skeletons) qui oscillent doucement en opacité (de 30% à 70% toutes les 1.5s).
4. **And** au chargement complet des données, les Skeletons s'effacent pour laisser place aux vrais profils via un fondu enchaîné de transition verticale en 200ms.

## Tasks / Subtasks

- [x] **Tâche 1 : Concevoir les Skeletons programmatiques oscillants** (AC: 3)
  - [x] Remplacer la classe `animate-pulse` standard par un conteneur `<motion.div>` haut de gamme dans le squelette de l'annuaire (`MemberCardSkeleton`).
  - [x] Configurer la transition cyclique d'opacité de 30% à 70% toutes les 1.5s (`animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}`).
  - [x] Appliquer la même configuration dans le squelette du profil académique (`ProfileSkeleton`).

- [x] **Tâche 2 : Implémenter le fondu enchaîné de transition verticale (200ms)** (AC: 4)
  - [x] Intégrer `AnimatePresence` avec `mode="wait"` autour des états de chargement de `src/pages/Members.jsx`.
  - [x] Ajouter les paramètres de transition verticale (déplacement en `y: 12` vers `y: 0`, et fondu de 200ms (`duration: 0.2`) lors du déchargement (`exit`).
  - [x] Structurer les variantes imbriquées de la grille de résultats pour préserver l'apparition staccato / stagger des cartes réelles après la disparition fluide des squelettes.
  - [x] Réécrire la structure de rendu de `src/pages/ResearcherProfile.jsx` avec `AnimatePresence` pour enchaîner le squelette `ProfileSkeleton` et le conteneur du profil réel avec la même transition verticale de 200ms.

- [x] **Tâche 3 : Validation de la conformité visuelle et fonctionnelle**
  - [x] Vérifier que les squelettes de chargement et la transition ne provoquent aucun à-coup visuel et s'articulent harmonieusement.

## Dev Notes

- **Ajustement de l'Opacité** :
  - L'oscillation est maintenant gérée par Framer Motion de manière ultra-précise (entre `0.3` et `0.7` avec une fonction d'accélération sinusoïdale bidirectionnelle `easeInOut` toutes les `1.5s`). Cela évite les pics brusques caractéristiques des animations CPU classiques et procure un feeling "cosmique/scientifique" haut de gamme.
- **Fondu Enchaîné Vertical** :
  - Le `mode="wait"` sur `AnimatePresence` garantit que les squelettes s'estompent et glissent vers le haut avant que les cartes réelles ne montent élégamment depuis le bas.

## Dev Agent Record

### Agent Model Used

Gemini 3 Pro

### Debug Log References

N/A

### Completion Notes List

- Upgraded the standard `MemberCardSkeleton` to use direct `<motion.div>` with custom looping values for a highly responsive and fluid 30%-70% opacity pulsing behavior.
- Refactored `ProfileSkeleton` in `src/pages/ResearcherProfile.jsx` to inherit the exact same programmatic performance metrics.
- Upgraded the page structure in both `src/pages/Members.jsx` and `src/pages/ResearcherProfile.jsx` using `AnimatePresence` with `mode="wait"` and `duration: 0.2` custom spring displacements for beautiful vertically shifting crossfades.

### File List

- `src/pages/Members.jsx`
- `src/pages/ResearcherProfile.jsx`
