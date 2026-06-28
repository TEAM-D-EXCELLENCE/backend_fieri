---
title: "5-4 Private Researcher Profile Editing"
story_key: 5-4-private-researcher-profile-editing
baseline_commit: ''
created_at: 2026-06-01T00:00:00+01:00
status: ready-for-dev
---

# 5-4 : Édition privée du profil chercheur

Résumé
-------
En tant que chercheur connecté, je veux pouvoir modifier mon profil privé (informations personnelles, affiliations, biographie, liens CV/portfolio) afin de maintenir mes données à jour et visibles dans mon Dashboard privé.

Critères d'acceptation
-----------------------
- Given un utilisateur connecté avec rôle `Chercheur`, When il accède à `/dashboard` puis clique sur "Modifier mon profil", Then la vue d'édition s'ouvre avec un formulaire pré-rempli depuis `GET /researchers/me`.
- Given des modifications valides, When l'utilisateur soumet le formulaire, Then l'appel `PUT /researchers/me` est effectué et les données sont persistées (mock en dev) et un Toast de confirmation s'affiche.
- Given un utilisateur non connecté, When il tente d'accéder à la page d'édition, Then il est redirigé vers `/auth` (guard) et le flux reprend après authentification.
- Given des erreurs de validation côté client (champ requis manquant ou format email invalide), Then les erreurs sont affichées inline et l'appel réseau n'est pas exécuté.
- Given une panne réseau en environnement `import.meta.env.DEV`, When l'API distante échoue, Then `services/api.js` bascule vers `mockDb.js` et la mise à jour est simulée en local sous la clé `fieri_db_researchers`.
- Given l'environnement `import.meta.env.PROD`, When l'API distante échoue, Then l'erreur est propagée et un Toast d'erreur est affiché (aucun fallback).

Tâches / Sous-tâches
--------------------
- [ ] 5-4.1 : Créer la page/composant `src/pages/ResearcherProfileEdit.jsx` (formulaire accessible clavier, pré-rempli)
  - [ ] 5-4.1.1 : Intégrer `AuthContext` pour vérification de rôle et redirection guard
  - [ ] 5-4.1.2 : Appeler `GET /researchers/me` via `src/services/api.js` pour pré-remplissage
  - [ ] 5-4.1.3 : Valider les champs (email, affiliations, liens) côté client
- [ ] 5-4.2 : Implémenter l'appel `PUT /researchers/me` minimal dans `src/services/api.js` et assurer fallback `mockDb.js` en dev
- [ ] 5-4.3 : Étendre `mockDb.js` pour gérer la clé `fieri_db_researchers` si nécessaire (création/lecture/mise à jour)
- [ ] 5-4.4 : Ajouter tests unitaires pour logique de validation et service API (Vitest/Jest selon configuration)
- [ ] 5-4.5 : Ajouter tests d'intégration pour le flow complet (render page, pré-remplissage, édition, soumission) — préférer tests de composants
- [ ] 5-4.6 : Mettre à jour `src/context/DataContext.jsx` si nécessaire pour invalider/rafraîchir le cache après `PUT`
- [ ] 5-4.7 : Documenter les modifications dans `File List` et `Change Log`

Dev Notes
---------
- Endroits impactés (lecture obligatoire avant modification) :
  - `src/context/AuthContext.jsx` — gestion du rôle et du token
  - `src/services/api.js` — wrapper fetch + fallback
  - `src/services/mockDb.js` — adaptateur local (utilise `ancien_contenu.json` et `localStorage` préfixé `fieri_`)
  - `src/pages/ResearcherProfile.jsx` — page publique/preview (vérifier cohabitation)
  - `src/pages/Dashboard.jsx` — point d'entrée pour lien "Modifier mon profil"

Implémentation proposée
------------------------
- Créer un composant `ResearcherProfileEdit.jsx` placé dans `src/pages/` suivant les patterns architecturaux (`PascalCase`, `.jsx`).
- Utiliser `useEffect` pour `GET /researchers/me` au montage et pré-remplir `useState` contrôlé par le formulaire.
- Soumettre via `api.put('/researchers/me', payload)` — adapter `api.js` pour exposer `get`, `put`, `post`, `delete` helpers.
- Valider localement avec règles simples (email regex, champs requis) et afficher erreurs inline.
- Après succès, invalider le cache DataContext et émettre un Toast via `src/components/common/Toast.jsx`.

Dev Agent Record
----------------
Debug Log:

- 2026-06-01: Story créée automatiquement par `create-story` (analysis engine). Baseline commit empty until developer marks baseline.
- 2026-06-01: Démarrage implémentation (dev-story). Story passée en in-progress dans sprint-status.

Implementation Plan:

- Phase 1: Implémenter endpoint client minimal (`api.js` put) + mockDb updates.
- Phase 2: Créer UI d'édition et intégrer Auth guard.
- Phase 3: Tests unitaires et d'intégration.
- Phase 4: Documentation File List & Change Log, set status ready-for-dev → done by dev agent.

File List (à remplir pendant l'implémentation)
-------------------------------------------
- (nouveau) src/pages/ResearcherProfileEdit.jsx
- (modifié) src/services/api.js
- (modifié) src/services/mockDb.js
- (modifié) src/context/DataContext.jsx (si cache invalidation requise)
- (modifié) src/pages/Dashboard.jsx (lien vers l'édition)

Change Log
----------
- 2026-06-01: Story créé — "Ultimate context engine analysis completed - comprehensive developer guide created"

Status
------
in-progress
