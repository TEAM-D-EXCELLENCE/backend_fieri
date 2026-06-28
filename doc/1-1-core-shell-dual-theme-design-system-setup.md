---
baseline_commit: NO_VCS
---
# Story 1.1: Core Shell, Dual-Theme & Design System Setup

Status: done

## Story

En tant que **visiteur du site**,
Je veux **disposer d'une interface unifiée premium avec barre de navigation et barre latérale fluide, réactive au clic et supportant instantanément le basculement entre les modes clair "Aube Cosmique" et sombre "Dark Cosmique"**,
Afin de **pouvoir naviguer agréablement et sans saccade sur tous mes écrans (mobile, tablette, desktop)**.

## Acceptance Criteria

1. **Given** un projet React 19 configuré avec Vite 8, Tailwind v4 et l'alias `@/*` pour les chemins de fichiers.
2. **When** l'application se charge pour la première fois.
3. **Then** l'élément structurel stable `AppLayout.jsx` (Layout Shell central) est rendu, englobant la `Navbar` supérieure et la `Sidebar` latérale de façon stable et persistante sans rechargement visuel.
4. **And** les textes utilisent exclusivement la police *Plus Jakarta Sans* conformément à l'échelle typographique stricte de `DESIGN.md`.
5. **And** au clic sur l'icône de rétractation de la `Sidebar`, celle-ci effectue une transition fluide de `40px` (icônes seules et point d'énergie orange/ambre pulsant) à `240px` (textes visibles) en 300ms via `cubic-bezier(0.16, 1, 0.3, 1)` avec un fondu des textes en 150ms.
6. **And** au clic sur le commutateur de thème, la classe `.light-theme` est ajoutée/retirée sur `document.body` pour appliquer instantanément le dégradé Hero stellaire clair ou le fond sombre opaque conforme aux palettes définies dans `DESIGN.md`.

## Tasks / Subtasks

- [x] **Tâche 1 : Initialisation de l'arborescence et création de la coquille (AC: 1, 3)**
  - [x] Créer le sous-répertoire de structure `src/components/layout/` s'il n'existe pas.
  - [x] Créer le composant structurel central `src/components/layout/AppLayout.jsx`.
  - [x] Déclarer les interfaces des composants `src/components/layout/Navbar.jsx` et `src/components/layout/Sidebar.jsx`.

- [x] **Tâche 2 : Intégration et validation des jetons du Design System (AC: 4, 6)**
  - [x] S'assurer que le fichier `src/index.css` importe correctement la police *Plus Jakarta Sans* de Google Fonts.
  - [x] Confirmer que le bloc `@theme` de `/src/index.css` centralise toutes les variables Tailwind v4 nécessaires sans aucun fichier `tailwind.config.js` ni `postcss.config.js`.
  - [x] S'assurer que le sélecteur de classe sémantique `body.light-theme` dans `src/index.css` surcharge les couleurs pour le mode "Aube Cosmique" conformément à `DESIGN.md` (Violet Royal `#6C4CF1`, Bleu Glacé `#EAF0FF`, Orange Brûlé `#E76F00`, etc.).

- [x] **Tâche 3 : Implémenter le commutateur de thème réactif (AC: 6)**
  - [x] Réutiliser ou adapter l'état de thème réactif de `App.jsx` (`theme`, `setTheme`) et la logique `toggleTheme()`.
  - [x] S'assurer que l'application de la classe `light-theme` s'effectue exclusivement sur `document.body` de façon synchrone.
  - [x] Assurer la transmission fluide de l'état du thème aux composants enfants.

- [x] **Tâche 4 : Conception des composants du Layout Shell (AC: 3, 5)**
  - [x] **Navbar.jsx** : Extraire la navigation supérieure capsule de `App.jsx` et y injecter les contrôles de thémisation et de session.
  - [x] **Sidebar.jsx** : Développer la barre latérale cinématique destinée aux profils connectés (Chercheur/Admin) :
    - Mode contracté : Largeur fixe de `40px` affichant les icônes de Lucide React et un indicateur pulsant ambre/orange.
    - Mode déployé : Expansion à `240px` en 300ms (`cubic-bezier(0.16, 1, 0.3, 1)`) au survol ou au clic.
    - Effets d'apparition progressive (fade-in) des libellés textuels en 150ms.
  - [x] **AppLayout.jsx** : Fusionner la `Navbar` supérieure et la `Sidebar` latérale dans un wrapper structurel unique et stable. Utiliser Framer Motion (`AnimatePresence`) pour animer la zone d'affichage centrale dynamique avec un fondu enchaîné doux (`fade-in` de 200ms avec translation verticale de 10px).

- [x] **Tâche 5 : Refactoring de App.jsx et validation de pureté (AC: 1, 3)**
  - [x] Mettre à jour `src/App.jsx` pour instancier `AppLayout` autour du sélecteur de page active (`renderPage()`).
  - [x] Vérifier que tous les imports respectent les exigences du projet (comme la pureté et l'inclusion explicite de `import React from 'react'`).
  - [x] Exécuter un build de production (`npm run build`) pour s'assurer que le compilateur React (React Compiler) valide sans erreurs et que le code reste parfaitement pur.

## Dev Notes

- **Conventions d'import/export** : Utiliser exclusivement `export default` pour les composants et inclure explicitement `import React from 'react'` dans chaque fichier JSX (requis pour le React Compiler).
- **Routage SPA** : Ne pas installer de routeur client-side externe. Le routage reste orchestré par l'état réactif local dans `src/App.jsx` via la prop `navigate()`.
- **Pureté React** : Éviter toute mutation directe de props ou d'état. Les effets de bord dans les rendus de composants sont formellement proscrits pour que le compilateur optimise le rendu automatiquement.
- **Micro-animations** : Utiliser la courbe d'accélération standard du projet `ease: [0.16, 1, 0.3, 1]` pour toute transition CSS ou Framer Motion.

### Project Structure Notes

- Tous les nouveaux composants layout doivent être placés dans `src/components/layout/`.
- Utiliser l'alias `@/*` pour tout import inter-couche afin de conserver une structure propre.
- Pas de fichiers `.module.css`. Tout le styling doit reposer sur les classes Tailwind standard et les classes utilitaires déclarées dans `src/index.css` (comme `.glass-panel`).

### References

- **Visual Specifications & Colors** : [`DESIGN.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/ux-designs/ux-Fieri-2026-05-30/DESIGN.md) (Sections *Colors*, *Typography*, *Elevation & Depth*, *Shapes*).
- **Interaction & Routing** : [`EXPERIENCE.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/ux-designs/ux-Fieri-2026-05-30/EXPERIENCE.md) (Section *Component Patterns* et *State Patterns*).
- **Architectural Rules** : [`architecture.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/architecture.md) (Sections *Complete Project Directory Structure* et *Component Boundaries & Central Layout Shell*).
- **Project Coding Rules** : [`project-context.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/project-context.md) (Sections *Stack technique & Versions*, *Règles d'implémentation critiques*, *Règles Langage & Framework*).

## Dev Agent Record

### Agent Model Used

gemini-2.5-pro

### Debug Log References

N/A

### Completion Notes List

N/A

### File List

N/A
