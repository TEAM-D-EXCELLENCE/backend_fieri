---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 3.2: Project Details & Interactive Follow

Status: done

## Story

En tant que **membre connecté de la FIERI**,
Je veux **consulter la timeline des jalons d'un projet de recherche et m'y abonner en un clic**,
Afin de **suivre pas à pas les découvertes scientifiques réalisées par le laboratoire**.

## Acceptance Criteria

1. **Given** la fiche détaillée d'un projet R&D (`/projects/:id`).
2. **When** la page est rendue.
3. **Then** une timeline interactive verticale présente les jalons passés (cochés), en cours (pulsant), et futurs du projet.
4. **And** le bouton d'abonnement "Suivre" permet de basculer l'état dans le localStorage (clé `fieri_followed_projects`) de manière persistante et affiche un Toast success.

## Tasks / Subtasks

- [x] **Tâche 1 : Concevoir la Timeline Verticale des Jalons** (AC: 1, 3)
  - [x] Construire une frise verticale pointillée à l'aide d'une bordure gauche subtile.
  - [x] Implémenter des noeuds réactifs avec des icônes indicatrices selon le statut de complétion.
  - [x] Intégrer un fondu d'apparition fluide des jalons.
- [x] **Tâche 2 : Intégrer le Système d'Abonnement Persistant** (AC: 4)
  - [x] Ajouter le bouton "Suivre ce projet" / "Projet suivi" à l'aide d'une icône de coeur et d'un contour réactif.
  - [x] Lier les clics aux méthodes `mockDb.projects.toggleFollow` et `mockDb.projects.isFollowed` préservant l'état dans `fieri_followed_projects`.
  - [x] Implémenter le retour par notification Toast.

## Completion Notes List

- Création de `src/pages/ProjectDetail.jsx` gérant la visualisation fine des projets R&D.
- Intégration de la timeline des jalons scientifiques de manière claire et épurée.
- Ajout de la gestion de la persistance de l'abonnement par projet relié directement à l'espace personnel (Dashboard).

## File List

- `src/pages/ProjectDetail.jsx`
