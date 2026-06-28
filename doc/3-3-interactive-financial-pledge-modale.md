---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 3.3: Interactive Financial Pledge Modale

Status: done

## Story

En tant que **membre connecté de la FIERI**,
Je veux **pouvoir formuler une promesse d'investissement virtuel sur les projets de recherche à l'aide d'une modale accessible**,
Afin de **participer activement à la vie et au financement fictif de nos pôles d'excellence**.

## Acceptance Criteria

1. **Given** la fiche détaillée d'un projet R&D (`/projects/:id`).
2. **When** je clique sur le bouton "Soutenir ce projet".
3. **Then** une modale glassmorphic s'ouvre, gérant l'accessibilité au clavier (Esc ferme la modale, Focus initial sur l'input de montant).
4. **And** la saisie de montants positifs et les boutons de présélection incrémentent les soutiens et le budget collecté en base de données, rafraîchissant les barres de progression en direct.

## Tasks / Subtasks

- [x] **Tâche 1 : Intégrer la Modale d'Investissement Accessible** (AC: 1, 3)
  - [x] Développer une modale glassmorphic animée (`bg-[#090d1a]/85 backdrop-blur-2xl border border-white/10 shadow-2xl`).
  - [x] Implémenter l'écouteur d'événements `Escape` pour fermer proprement la modale.
  - [x] Mettre en place un focus trap basique en assignant le focus à l'input dès le rendu de la modale.
- [x] **Tâche 2 : Gérer la Validation et les Progressions Budgétaires** (AC: 4)
  - [x] Ajouter des boutons présélections rapides (+100$, +500$, +1000$).
  - [x] Valider que le montant soit un nombre positif supérieur à zéro.
  - [x] Mettre à jour en direct le budget collecté et les compteurs de soutiens dans le `mockDb`.
  - [x] Déclencher des animations fluides de progression budgétaire.

## Completion Notes List

- Conception et intégration de la modale d'investissement fictif dans `src/pages/ProjectDetail.jsx`.
- Respect des règles strictes d'accessibilité au clavier.
- Interfaçage avec `mockDb` pour la mise à jour des statistiques de financement en temps réel.

## File List

- `src/pages/ProjectDetail.jsx`
