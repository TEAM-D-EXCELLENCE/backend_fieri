---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 2.1: Community Directory & Interactive Filters

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que **visiteur ou membre de FIERI**,
Je veux **rechercher et filtrer les chercheurs par nom, discipline (pôle) et institution (université) au sein de l'annuaire `/members`**,
Afin de **découvrir et d'entrer facilement en relation avec des spécialistes de mon domaine de recherche**.

## Acceptance Criteria

1. **Given** un visiteur naviguant vers la page `/members`.
2. **When** la page se charge.
3. **Then** l'annuaire complet de la communauté est rendu sous forme de cartes d'identité interactives affichant l'avatar, le rôle, l'université et les spécialités de chaque chercheur.
4. **And** l'utilisateur peut filtrer en temps réel les cartes via des inputs de recherche textuelle (pour les noms) et des sélecteurs de disciplines/pôles d'études ou d'universités.
5. **And** si la recherche ne renvoie aucun résultat, l'écran affiche une illustration de circuit brisé en traits fins et un message scientifique chaleureux ("Aucun chercheur ne correspond à vos filtres").

## Tasks / Subtasks

- [x] **Tâche 1 : Charger les données de la communauté R&D** (AC: 1, 2, 3)
  - [x] Consommer le service API `api.researchers.getAll()` dans `src/pages/Members.jsx` pour récupérer la liste brute des chercheurs.
  - [x] Gérer l'état de chargement (`isLoading`) et d'erreur de manière élégante.
  - [x] Garantir le respect strict de l'échelle typographique *Plus Jakarta Sans* spécifiée dans `DESIGN.md`.

- [x] **Tâche 2 : Concevoir la grille de cartes d'identité des membres** (AC: 3)
  - [x] Afficher les chercheurs sous forme de grille adaptative réactive (1 colonne sur mobile, 2 colonnes sur tablette, 3 colonnes sur desktop).
  - [x] Mettre en forme chaque chercheur avec une carte glassmorphic premium (`rgba(13,17,32,0.6)` avec flou de 20px et bordure fine `border: 1px solid rgba(255, 255, 255, 0.08)`).
  - [x] Afficher les attributs du chercheur : avatar (avec cercle ou angles légers), nom, rôle, université, pôle (discipline) et spécialités (tags/badges).
  - [x] Intégrer des indicateurs d'activité scientifique avec icônes (Publications, Projets, Followers/Stars).
  - [x] Ajouter une micro-animation de survol : élévation verticale de `-4px` avec lueur d'accentuation en 200ms ease-out (conforme à `DESIGN.md#UX-DR3`).
  - [x] Fournir un bouton ou lien d'action pour naviguer vers le profil public du chercheur (`/profile/:id`).

- [x] **Tâche 3 : Implémenter le panneau de filtrage interactif** (AC: 4)
  - [x] Créer un champ de recherche textuelle pour le nom (insensible à la casse, cherchant sur le prénom et le nom).
  - [x] Créer des contrôles de sélection (`<select>` ou boutons radio) pour filtrer par Pôle/Discipline et par Institution/Université.
  - [x] Dériver l'état de la liste filtrée directement au cours du rendu à partir des états de saisie (évitant les hooks synchrones `useEffect` sujets aux rendus en cascade, conformément aux retours de Story 1.5).
  - [x] Assurer un filtrage en temps réel extrêmement fluide (réponse immédiate au fur et à mesure de la saisie).

- [x] **Tâche 4 : Gérer l'état de recherche vide ("Empty Search State")** (AC: 5)
  - [x] Si la liste filtrée est vide, masquer la grille et afficher une illustration de circuit brisé en traits fins stylisée (SVG inline réactif aux thèmes).
  - [x] Afficher le message scientifique chaleureux et soigné : "Aucun chercheur ne correspond à vos filtres".

- [x] **Tâche 5 : Validation Qualité, Accessibilité & Build**
  - [x] S'assurer que le code est entièrement compatible avec React 19 et exempt d'avertissements de compilation.
  - [x] Vérifier la bonne prise en charge de l'accessibilité au clavier (Tabulation) pour tous les champs de saisie et sélecteurs.
  - [x] Garantir le respect des ratios de contraste WCAG 2.2 AA (notamment pour le violet royal `#6C4CF1` en mode clair et les textes atténués en mode sombre).
  - [x] Exécuter `npm run build` avec succès pour s'assurer de l'absence de régressions ou d'erreur.

## Dev Notes

- **Fichiers à modifier / créer** :
  - **UPDATE** : `src/pages/Members.jsx` (Pour implémenter l'annuaire et les filtres de recherche)
- **Modèle de données & mockDb** :
  - `DEFAULT_RESEARCHERS` dans `src/services/mockDb.js` contient déjà des champs de base (`id`, `name`, `role`, `avatar`, `bio`, `pole`, `publicationsCount`, `projectsCount`, `stars`).
  - Pour afficher l'université et les spécialités de chaque chercheur, nous pouvons enrichir `DEFAULT_RESEARCHERS` dans `src/services/mockDb.js` avec les champs `university` (ex: "Université Polytechnique de Fieri", "Sorbonne Université") et `specialties` (ex: `["SLAM", "ROS", "Navigation"]`), ou gérer intelligemment des valeurs par défaut si absentes.
- **Styling & Thémisation** :
  - Utiliser la double palette de couleurs de `DESIGN.md`. Le mode Sombre utilise des bordures subtiles et fonds glassmorphic, tandis que le mode Clair s'appuie sur le Violet Royal `#6C4CF1` et le Bleu Glacé `#EAF0FF`.

### Project Structure Notes

- Le composant `Members.jsx` s'intègre comme une page autonome de l'application gérée par le routage centralisé dans `src/App.jsx`.
- Aucun routage client externe (comme React Router) ne doit être introduit. Les transitions de page sont gérées par la fonction `navigate('route')` transmise en prop.

### References

- **Visual Specifications & Colors** : [`DESIGN.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/ux-designs/ux-Fieri-2026-05-30/DESIGN.md).
- **Project Coding Rules** : [`project-context.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/project-context.md).
- **Architecture Guidelines** : [`architecture.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/architecture.md).

## Dev Agent Record

### Agent Model Used

Gemini 3 Pro

### Debug Log References

### Completion Notes List

- Implémentation complète et responsive de la page `Members.jsx` avec disposition Bento et cartes glassmorphic haut de gamme.
- Intégration de contrôles interactifs (recherche textuelle dynamique insensible à la casse et sélecteurs de pôle scientifique / université).
- Calcul du filtrage de liste entièrement dérivé au cours du rendu pour éviter les effets de cascade `useEffect` (leçon apprise de l'Epic 1).
- Intégration d'effets visuels et micro-animations de survol interactifs avec halos radiaux (UX-DR3).
- Conception d'un état de recherche vide ("Empty Search State") premium avec illustration de circuit brisé en SVG inline et bouton de réinitialisation instantanée (UX-DR7).
- Enrichissement de `mockDb.js` avec les attributs `university` et `specialties` tout en préservant des valeurs par défaut pour la compatibilité descendante.

### File List

- `src/services/mockDb.js` (enrichissement des chercheurs par défaut)
- `src/pages/Members.jsx` (refonte complète de l'annuaire communautaire)

### Change Log

- **2026-05-31** : Développement et livraison finale de l'annuaire de la communauté et de ses filtres interactifs pour la Story 2.1.
