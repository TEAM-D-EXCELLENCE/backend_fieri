---
baseline_commit: NO_VCS
---
# Story 1.3: University Authentication & Gating Engine (AuthContext)

Status: done

## Story

En tant que **visiteur universitaire**,
Je veux **m'inscrire via le parcours multi-étapes universitaire et me connecter de manière sécurisée pour obtenir mes droits d'accès sélectifs**,
Afin **d'accéder aux vues restreintes (Dashboard, Profile) et de débloquer les boutons transactionnels selon mon rôle**.

## Acceptance Criteria

1. **Given** un utilisateur non connecté tentant d'accéder au `/dashboard` ou `/profile`.
2. **When** la tentative d'accès est initiée.
3. **Then** l'application redirige silencieusement et immédiatement l'utilisateur vers la vue `/auth`.
4. **And** le formulaire d'inscription `/auth` gère la validation multi-étapes de manière accessible au clavier, valide les identifiants universitaires fictifs et stocke le token JWT avec le préfixe `fieri_auth_token`.
5. **And** après connexion, l'état global `AuthContext` injecte automatiquement le header `Authorization: Bearer <token>` sur toutes les requêtes et adapte dynamiquement l'affichage de l'UI selon les rôles (Visiteur, Membre, Chercheur, Admin).

## Tasks / Subtasks

- [x] **Tâche 1 : Créer le Context Global d'Authentification (AuthContext.jsx) (AC: 5)**
  - [x] Créer `src/context/AuthContext.jsx` et son hook associé `useAuth()`.
  - [x] Gérer l'état de session global : `user` (objet utilisateur connecté), `token` (JWT local persisté), et `loading` (état de restauration initial).
  - [x] Restaurer la session utilisateur au démarrage en chargeant `fieri_auth_token` and `fieri_user` depuis `localStorage`.
  - [x] Exposer des méthodes globales : `login(email, password)`, `register({ email, password, firstName, lastName, branchId })`, `logout()`.
  - [x] Exposer des Helpers de rôle pratiques : `hasRole(role)`, `isAdmin()`, `isResearcher()`.
  - [x] Assurer la pureté du code pour le React Compiler (pas de mutations directes d'état).

- [x] **Tâche 2 : Refactoriser la Couche Réseau pour utiliser le préfixe fieri_auth_token (AC: 4, 5)**
  - [x] Modifier la méthode `getHeaders()` dans `src/services/api.js` pour qu'elle lise la clé `fieri_auth_token` au lieu de `fieri_token`.
  - [x] Mettre à jour les méthodes d'authentification de `api.auth` dans `src/services/api.js` (`login`, `register`, `logout`, `getProfile`, `isAuthenticated`, `getLocalUser`) pour qu'elles écrivent et lisent le token JWT sous la clé `fieri_auth_token`.
  - [x] Assurer la cohérence avec le mode mocké (`mockDb.js`) en conservant la persistance locale préfixée by `fieri_`.

- [x] **Tâche 3 : Intégrer l'AuthProvider dans la Racine et Gérer le Gating dans App.jsx (AC: 1, 2, 3, 5)**
  - [x] Envelopper l'application avec le `AuthProvider` dans `src/main.jsx` (idéalement à côté du `DataProvider`).
  - [x] Dans `src/App.jsx`, consommer `useAuth()` et synchroniser l'état local `user` (ou le remplacer par celui du contexte) pour alimenter les composants enfants.
  - [x] Implémenter le gating des routes : si un utilisateur non connecté tente d'accéder aux pages privées `'dashboard'` ou `'profile'`, rediriger silencieusement et instantanément vers la vue `'auth'` via `navigate('auth')` sans transition saccadée ni bug de défilement.

- [x] **Tâche 4 : Adapter et Sécuriser la page d'Authentification (Auth.jsx) (AC: 4)**
  - [x] Modifier `src/pages/Auth.jsx` pour consommer `useAuth()` à la place des appels API directs et des props d'état héritées de `App.jsx`.
  - [x] Améliorer l'accessibilité du parcours d'inscription multi-étapes (Étape 1 : Identité -> Étape 2 : Affiliation) :
    - [x] Gérer le focus clavier de manière fluide : lors de la transition à l'étape 2, focaliser automatiquement le premier champ de sélection de l'affiliation (le sélecteur de Pays).
    - [x] Ajouter des attributs ARIA appropriés (`aria-invalid`, `aria-describedby` ciblant les conteneurs d'erreur, et `role="alert"` pour les messages d'erreur à la volée).
    - [x] Assurer que tous les éléments interactifs sont navigables à l'aide de la touche `Tab` et activables avec `Entrée` ou `Espace`.
  - [x] Assurer la validation stricte des identifiants universitaires fictifs (Pays, Université, Branche) avant de permettre la soumission finale.

- [x] **Tâche 5 : Adapter dynamiquement l'UI en fonction des Rôles (AC: 5)**
  - [x] Configurer `Navbar.jsx`, `Sidebar.jsx`, et `AppLayout.jsx` pour réagir de manière dynamique à l'utilisateur connecté et à son rôle précis (`Visiteur`, `Membre`, `Chercheur`, `Admin`).
  - [x] Afficher des badges visuels haut de gamme (ex: "Chercheur FIERI" ou "Membre Académique") basés sur le rôle de l'utilisateur.
  - [x] Restreindre ou libérer les onglets et boutons transactionnels (ex: le bouton d'édition de profil pour `CHERCHEUR` uniquement, les outils d'administration pour `ADMIN`, ou l'adhésion pour les simples membres).

- [x] **Tâche 6 : Validation Qualité & Compilation de Production**
  - [x] Exécuter `npm run build` pour valider la pureté stricte exigée par le React Compiler.
  - [x] Tester manuellement le parcours d'inscription, de connexion et le gating silencieux depuis un navigateur pour s'assurer de l'absence totale de régressions., de connexion et le gating silencieux depuis un navigateur pour s'assurer de l'absence totale de régressions.

## Dev Notes

- **Fichiers à modifier / créer** :
  - **NEW** : `src/context/AuthContext.jsx` (Le fournisseur et hook d'authentification)
  - **UPDATE** : `src/main.jsx` (Pour déclarer le provider global)
  - **UPDATE** : `src/services/api.js` (Pour le préfixe de token `fieri_auth_token` dans les requêtes et le localStorage)
  - **UPDATE** : `src/App.jsx` (Pour implémenter le gating silencieux des pages restreintes)
  - **UPDATE** : `src/pages/Auth.jsx` (Pour le formulaire accessible et l'intégration du hook `useAuth`)
  - **UPDATE** : `src/components/layout/Navbar.jsx` et `Sidebar.jsx` (Pour l'UI dynamique selon les rôles)
- **Convention React 19** : Pensez à inclure `import React from 'react'` au début de tout nouveau fichier JSX et à utiliser l'extension explicite `.jsx` pour tous les chemins d'importation.
- **Règles CSS Tailwind v4** : Ne déclarez aucune classe inline brute avec des couleurs fixes ; préférez les variables sémantiques ou le styling existant dans `src/index.css`.

### References

- **Visual Specifications & Colors** : [`DESIGN.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/ux-designs/ux-Fieri-2026-05-30/DESIGN.md).
- **Architectural Rules** : [`architecture.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/architecture.md).
- **Project Coding Rules** : [`project-context.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/project-context.md).
- **Epics Specs & BDD** : [`epics.md`](file:///home/precieux/excellence%20team/essaie/Fieri/_bmad-output/planning-artifacts/epics.md).
