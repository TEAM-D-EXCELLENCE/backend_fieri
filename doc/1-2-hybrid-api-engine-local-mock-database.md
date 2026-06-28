---
baseline_commit: NO_VCS
---
# Story 1.2: Hybrid API Engine & Local Mock Database

Status: done

## Story

En tant que **développeur travaillant en local ou utilisateur final**,
Je veux **que l'application charge en cache les métadonnées dès son initialisation et intercepte les requêtes réseau pour basculer de façon invisible sur une base mockée en cas de déconnexion ou de pannes API locales**,
Afin de **garantir une continuité de service irréprochable sans perturber mon expérience utilisateur**.

## Acceptance Criteria

1. **Given** l'application en cours d'initialisation en mode développement local (`import.meta.env.DEV`).
2. **When** le composant racine se monte.
3. **Then** les métadonnées (Pays, Universités, Branches d'études) sont récupérées et stockées en cache local (`DataContext.jsx`).
4. **And** si un appel API vers `https://backend-fieri.vercel.app` échoue en 404 ou réseau, le wrapper `api.js` bascule silencieusement sur `mockDb.js` (persistance `localStorage` préfixée par `fieri_` et initialisée par `ancien_contenu.json`).
5. **And** en production (`import.meta.env.PROD`), aucun repli n'est toléré ; l'erreur réseau est propagée pour être capturée par un Toast utilisateur informatif.

## Tasks / Subtasks

- [x] **Tâche 1 : Créer la Base de Données Mockée et Persistante (mockDb.js) (AC: 4)**
  - [x] Créer `src/services/mockDb.js` avec persistance `localStorage` préfixée par `fieri_`.
  - [x] Importer `ancien_contenu.json` pour initialiser `clubs`, `events`, `news`, etc.
  - [x] Intégrer les données riches de R&D existantes (projets, workshops, chercheurs, notifications) si non présentes en stockage local.
  - [x] Exposer des méthodes CRUD simulées avec latence réseau réaliste pour toutes les entités métiers.

- [x] **Tâche 2 : Refactoriser la Couche Service API (api.js) (AC: 4, 5)**
  - [x] Mettre à jour `src/services/api.js` pour intercepter les requêtes HTTP échouant en 404, 5xx ou erreur réseau.
  - [x] Intégrer le basculement transparent (fallback silencieux) vers `mockDb.js` uniquement si `import.meta.env.DEV` est vrai.
  - [x] S'assurer qu'en production (`import.meta.env.PROD`), aucune interception silencieuse n'est effectuée et que les erreurs réseau se propagent normalement.

- [x] **Tâche 3 : Implémenter le Cache d'État Global et Pré-chargement (DataContext.jsx) (AC: 2, 3)**
  - [x] Créer `src/context/DataContext.jsx` et son hook associé `useData()`.
  - [x] Au montage du composant principal, récupérer récursivement ou en cascade toutes les métadonnées organisationnelles (Pays, Universités, Branches).
  - [x] Mettre en cache ces données d'affiliation pour éliminer les temps de latence réseau lors de l'enregistrement de nouveaux membres.
  - [x] Exposer l'état de chargement et les données d'affiliation à toute l'arborescence de composants.

- [x] **Tâche 4 : Intégrer le DataContext dans la Racine et Remplacer l'Affiliation dans Auth.jsx (AC: 2, 3)**
  - [x] Envelopper l'application avec le `DataProvider` dans `src/main.jsx`.
  - [x] Adapter `/src/pages/Auth.jsx` pour consommer les métadonnées instantanément depuis `useData()` au lieu de déclencher des requêtes HTTP à chaque clic ou changement d'état.
  - [x] S'assurer que le basculement dynamique pays -> université -> branche s'effectue instantanément sans saccade visuelle.

- [x] **Tâche 5 : Validation Qualité & Compilation de Production (AC: 1, 5)**
  - [x] Exécuter `npm run build` pour garantir que le React Compiler valide la pureté du code sans aucune erreur de compilation.
  - [x] Effectuer un audit rapide de non-régression sur l'authentification et les pages existantes.

## Dev Notes

- **Conventions d'import/export** : Utiliser exclusivement `export default` pour les composants et inclure explicitement `import React from 'react'` dans chaque fichier JSX (requis pour le React Compiler).
- **Persistance LocalStorage** : Toutes les clés locales doivent être préfixées par `fieri_` (ex. `fieri_db_clubs`, `fieri_db_projects`).
- **Mode Production** : S'assurer de respecter strictement la distinction entre `import.meta.env.DEV` et `import.meta.env.PROD` pour les comportements de repli.

### References

- **Visual Specifications & Colors** : [`DESIGN.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/ux-designs/ux-Fieri-2026-05-30/DESIGN.md).
- **Architectural Rules** : [`architecture.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/architecture.md).
- **Project Coding Rules** : [`project-context.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/project-context.md).
