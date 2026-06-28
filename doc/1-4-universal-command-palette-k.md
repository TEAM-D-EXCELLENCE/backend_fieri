---
baseline_commit: NO_VCS
---
# Story 1.4: Universal Command Palette (⌘K)

Status: ready-for-dev

## Story

En tant que **utilisateur adepte des raccourcis clavier**,
Je veux **ouvrir à tout moment un panneau de contrôle global par la combinaison ⌘K ou Ctrl+K**,
Afin **de naviguer rapidement, basculer les thèmes et lancer des raccourcis de recherche sans lâcher mon clavier**.

## Acceptance Criteria

1. **Given** l'application active à l'écran.
2. **When** l'utilisateur appuie simultanément sur `⌘K` (ou `Ctrl+K`).
3. **Then** une modale glassmorphic centrée s'ouvre instantanément en fondu enchaîné de 150ms.
4. **And** le focus clavier est automatiquement placé sur l'input de recherche de la palette.
5. **And** l'utilisateur peut naviguer avec les flèches du clavier (`Haut` / `Bas`) et valider par `Entrée` ou fermer par `Échap` en toute accessibilité.
6. **And** les options incluent : "Basculer vers le mode clair/sombre", "Naviguer vers les opportunités/projets/actualités/clubs".

## Tasks / Subtasks

- [ ] **Tâche 1 : Créer le composant de Palette de Commande (CommandPalette.jsx)**
  - [ ] Créer `src/components/CommandPalette.jsx` avec une modale glassmorphic de type bento.
  - [ ] Implémenter l'écouteur d'événements global sur `keydown` pour intercepter `metaKey + K` (⌘K) et `ctrlKey + K` (Ctrl+K).
  - [ ] Gérer l'état d'ouverture/fermeture du composant.
  - [ ] Utiliser `Framer Motion` pour l'effet de fondu enchaîné de 150ms à l'ouverture et à la fermeture.

- [ ] **Tâche 2 : Gérer l'accessibilité (A11y) et le focus clavier**
  - [ ] Focaliser automatiquement l'input de recherche de la palette dès l'ouverture.
  - [ ] Permettre la navigation clavier via les touches `ArrowUp` et `ArrowDown` pour survoler les commandes disponibles.
  - [ ] Déclencher l'action sélectionnée lors de l'appui sur `Enter`.
  - [ ] Fermer la palette sur l'appui de `Escape`.
  - [ ] Mettre en place des attributs ARIA complets (`role="dialog"`, `aria-modal="true"`, `aria-label="Palette de commandes"`, `aria-expanded`).

- [ ] **Tâche 3 : Fournir les options et actions globales**
  - [ ] Fournir l'option de basculement du thème (Clair / Sombre) avec retour visuel immédiat.
  - [ ] Fournir les options de navigation rapide vers les principales routes de l'application : `projects`, `news`, `clubs`, `opportunities`, `dashboard`.
  - [ ] Intégrer un système de filtrage temps réel basé sur la saisie utilisateur.
  - [ ] Si aucune commande ne correspond, afficher un état vide élégant et poli.

- [ ] **Tâche 4 : Intégrer la Palette dans AppLayout.jsx**
  - [ ] Importer et injecter `<CommandPalette />` dans le layout principal `src/components/layout/AppLayout.jsx`.
  - [ ] Partager les handlers de navigation (`navigate`) et de gestion du thème (`theme`, `toggleTheme`) avec la Palette de Commande.

- [ ] **Tâche 5 : Validation Qualité & Compilation de Production**
  - [ ] Exécuter `npm run build` pour s'assurer qu'aucune régression ni erreur de compilation n'est présente.
  - [ ] Valider le comportement d'ouverture, de navigation clavier et d'action depuis le navigateur.

## Dev Notes

- **Fichiers à modifier / créer** :
  - **NEW** : `src/components/CommandPalette.jsx` (Le composant autonome de palette)
  - **UPDATE** : `src/components/layout/AppLayout.jsx` (Pour l'injection globale dans le Shell)
- **Convention React 19** : Respecter les imports et s'assurer de ne pas faire de mutation directe.
- **Styling** : Utiliser des classes glassmorphic issues du système de design (ex: `.glass-panel`).

### References

- **Visual Specifications & Colors** : [`DESIGN.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/ux-designs/ux-Fieri-2026-05-30/DESIGN.md).
- **Project Coding Rules** : [`project-context.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/project-context.md).
