---
baseline_commit: 70dd977785cf4914553133276b53a78746ad001b
---
# Story 3.4: Scientific Opportunities Hub & Applications

Status: done

## Story

En tant que **chercheur ou étudiant de la FIERI**,
Je veux **consulter les offres scientifiques (doctorats, R&D) et postuler de manière interactive, ou en soumettre si je suis chercheur**,
Afin de **collaborer et rejoindre les équipes de recherche appliquées**.

## Acceptance Criteria

1. **Given** le portail d'opportunités (`/opportunities`) chargé.
2. **When** un étudiant clique sur "Postuler".
3. **Then** une modale s'ouvre demandant les réalisations et simulant le dépôt de CV avec Toast de succès.
4. **And** si un chercheur connecté clique sur "Publier", un formulaire valide l'offre et l'ajoute au `mockDb`.

## Tasks / Subtasks

- [x] **Tâche 1 : Concevoir le Matchmaking Scientifique** (AC: 1, 2, 3)
  - [x] Implémenter `src/pages/Opportunities.jsx` avec des fiches de postes adaptées (salaire, discipline, type).
  - [x] Créer la modale glassmorphic de candidature étudiante avec autofill du nom et de l'adresse email.
  - [x] Simuler le drag-and-drop ou le clic pour le dépôt de CV avec validation.
- [x] **Tâche 2 : Développer le Formulaire Chercheur de Publication** (AC: 4)
  - [x] Configurer la visibilité du bouton "Publier" selon la présence d'une connexion et du rôle `CHERCHEUR` ou `ADMIN`.
  - [x] Développer la modale de création d'opportunité avec contrôles stricts de disciplines et de salaires positifs.
  - [x] Connecter le formulaire aux services d'ajout dans le `mockDb` pour un rechargement en temps réel.

## Completion Notes List

- Conception complète de la page `src/pages/Opportunities.jsx`.
- Seeding initial de 3 opportunités (Smart Farming, SLAM ROS2, Micro-Grids Solaires) dans le `mockDb.js`.
- Respect de la charte graphique SaaS Cosmique avec glassmorphism et animations de transitions.

## File List

- `src/pages/Opportunities.jsx`
- `src/services/mockDb.js`
