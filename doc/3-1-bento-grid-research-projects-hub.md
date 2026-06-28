---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 3.1: Bento Grid Research Projects Hub

Status: done

## Story

En tant que **visiteur ou chercheur de la FIERI**,
Je veux **consulter le hub de projets scientifiques sous forme d'une Bento Grid asymétrique interactive**,
Afin de **comprendre immédiatement les thématiques clés, les progrès budgétaires et d'explorer les détails de nos innovations**.

## Acceptance Criteria

1. **Given** la page du Hub R&D (`/projects`) chargée publiquement.
2. **When** la liste de projets est rendue.
3. **Then** les projets s'affichent sous forme de Bento Grid asymétrique haut de gamme où la première initiative à la Une occupe une largeur double (deux colonnes sur desktop).
4. **And** les cartes utilisent le style cosmique glassmorphic (fond translucide sombre, flou de fond, bordure subtile et halo lumineux interactif au survol).

## Tasks / Subtasks

- [x] **Tâche 1 : Mettre en place le conteneur asymétrique Bento Grid** (AC: 1, 3)
  - [x] Créer `src/pages/Projects.jsx` avec une disposition CSS Grid (`grid-cols-1 md:grid-cols-3 gap-8`).
  - [x] Configurer la mise en page dynamique : le premier projet occupe `md:col-span-2`, tandis que les suivants sont en `col-span-1`.
- [x] **Tâche 2 : Styliser les cartes R&D Cosmiques** (AC: 4)
  - [x] Appliquer le style glassmorphic (`bg-[#0d1120]/60 backdrop-blur-xl border border-white/5`).
  - [x] Ajouter un halo lumineux radial dynamique par carte à l'aide de gradients css.
  - [x] Gérer le survol avec des animations fluides Framer Motion (élévation verticale `y: -4` et ombres portée colorées bleutées).

## Completion Notes List

- Création de `src/pages/Projects.jsx` gérant le Hub Technologique.
- Implémentation d'une grille interactive supportant la recherche textuelle en temps réel et le filtrage dynamique par statut ("Tous", "Actifs", "En R&D").
- Intégration de micro-animations fluides de survol Framer Motion.

## File List

- `src/pages/Projects.jsx`
