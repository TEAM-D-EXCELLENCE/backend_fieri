---
story_id: 5.3
story_key: 5-3-interactive-personal-dashboard-notifications-center
title: "Dashboard personnel interactif & Centre de notifications"
author: Kavt
status: ready-for-dev
created: 2026-05-31T22:00:00+01:00
baseline_commit: 21b97931478d1bc4969481f79921904058251e2d
---

# Contexte de la story

En tant que membre connecté, je veux un `Dashboard` personnel regroupant mes projets suivis, clubs, ateliers et surtout un `Centre de notifications` interactif (marquer comme lu, tout effacer, pagination/infinite scroll) afin de piloter mes activités et ne rien manquer.

## Résumé fonctionnel
- Page cible: `/dashboard` (rendue via le `renderPage()` d'`App.jsx`) 
- Composants principaux à fournir: `Dashboard.jsx`, `NotificationsCenter.jsx`, `NotificationItem.jsx`, `DashboardSummary.jsx` (statistiques rapides)
- Persistances: lecture/écriture via `src/services/api.js` (wrapper) → en développement basculer silencieusement vers `src/services/mockDb.js` et clé `fieri_notifications`

## Acceptance Criteria (dérivé d'Epic 5 / Story 5.3)

1. Given un membre connecté, When il visite `/dashboard`, Then il voit:
   - un panneau de statistiques (projets suivis, clubs, ateliers inscrits) et
   - un panneau `Notifications` listant les notifications récentes triées par `createdAt` (desc).
2. Notifications: chaque notification expose `title`, `body` (ou résumé), `type` (info|success|warning|error|event), `createdAt`, `read` (bool).
3. Actions disponibles:
   - `Marquer comme lu` par notification (PATCH via `api` → `mockDb` en DEV) — UI réactive et optimiste.
   - `Tout marquer comme lu` pour toutes les notifications visibles.
   - `Tout effacer` supprime localement les notifications (avec confirmation modal accessible au clavier).
   - Pagination ou chargement infini (load-more) si > 50 notifications; utiliser lazy-load au scroll.
4. Notifications interactives: cliquer sur une notification appelle `navigate()` avec un `params` (ex: `navigate('project-detail', { projectId })`), conforme aux patterns d'`App.jsx`.
5. Accessibilité: toutes les actions accessibles au clavier; `Esc` ferme tout overlay; focus management conforme (`focus trap` dans la modale de confirmation).
6. En DEV (`import.meta.env.DEV`) l'API doit tolérer basculement vers `mockDb.js` si l'endpoint échoue; en PROD (`import.meta.env.PROD`) toute erreur réseau est propagée et affichée via Toast.
7. Respecter les règles projet du `project-context.md`: React 19, Vite 8, Tailwind v4, pas de router externe, utilisation d'alias `@/*`, `localStorage` préfixé `fieri_`.

## Developer Context & Guardrails (CRITIQUE)

- Lire avant implémentation (obligatoire):
  - _bmad-output/project-context.md
  - `src/App.jsx` (gestion `user`, `navigate`, `setUser`, `renderPage()`)
  - `src/components/layout/AppLayout.jsx` (shell layout permanent)
  - `src/services/api.js` (wrapper réseau) et `src/services/mockDb.js`

- Données & formes attendues (type schema):
  - Notification {
    id: string,
    type: 'info'|'success'|'warning'|'error'|'event',
    title: string,
    body?: string,
    metadata?: object,
    read: boolean,
    createdAt: ISOString
  }

- Règles non négociables:
  - Ne pas introduire React Router ; utiliser `navigate()` fourni par `App.jsx`.
  - Tous les imports entre dossiers doivent utiliser l'alias `@/*`.
  - Ne pas accéder à `localStorage` directement — utiliser l'abstraction existante (`api.auth` / `mockDb` helpers).
  - Respecter la pureté exigée par le React Compiler (pas de mutation d'objets partagés, utiliser fonctions immuables pour mise à jour d'état).

## Technical requirements

- Endpoints (via `src/services/api.js`):
  - `GET /notifications?limit=20&offset=0` → retourne `Notification[]`
  - `PATCH /notifications/:id/read` → marque `read=true`
  - `POST /notifications/mark-all-read` → marque toutes `read=true`
  - `DELETE /notifications` (body: { confirm: true }) → supprime (clear) toutes les notifications

- Mock behaviour (DEV):
  - `mockDb.js` doit exposer mêmes méthodes que `api` et persister sous la clé `fieri_notifications`.
  - `mockDb` doit initialiser un petit dataset si vide (sample 10 notifications) en utilisant `ancien_contenu.json` comme référence si utile.

- UI behaviour:
  - Liste triée par `createdAt` desc, groupage visuel par jour (Aujourd'hui, Hier, Plus ancien).
  - Indicateur de badge non-lu (dot 6px pulsant, respecter UX-DR5) sur l'icône Notifications dans la Navbar (implémenter via `AppLayout.jsx` slot).
  - Optimistic update: marquage comme lu met à jour l'UI immédiatement et rollback si l'API renvoie erreur.

## File structure & changes (suggestion minimale)

- Créer / Modifier:
  - src/pages/Dashboard.jsx (page wrapper qui reçoit `user`, `navigate`, `setUser`)
  - src/components/dashboard/Dashboard.jsx (layout interne dashboard)
  - src/components/dashboard/DashboardSummary.jsx (statistiques rapides)
  - src/components/dashboard/NotificationsCenter.jsx (liste + actions)
  - src/components/dashboard/NotificationItem.jsx (single item)
  - src/services/notifications.js (adapter léger qui appelle `api` endpoints)
  - src/services/mockDb.js (vérifier exposés existants; ajouter clé `fieri_notifications` si manquant)
  - src/components/layout/AppLayout.jsx (ajouter badge notifications slot si non présent)

## Testing requirements

- Tests unitaires ciblés (préférer tests courts et robustes):
  - `NotificationsCenter` behaviour: list rendering, mark-as-read optimistic update, clear flow with confirmation.
  - `notifications.js` adapter: response shape mapping, error handling, fallback to `mockDb` in DEV.

- Commands (local dev):
  - Lint & build checks: `pnpm run lint`, `pnpm run build` (validate React Compiler).
  - Run targeted eslint on changed files: `pnpm exec eslint src/components/dashboard src/services/notifications.js`

## Previous story intelligence

- Related stories and patterns to follow:
  - 5-1: scientific-news-hub-peer-review-flow — notifications triggered by editorial workflow (réutiliser types/patterns)
  - 5-2: scientific-events-selective-live-streaming — live-event badge and read/access gating patterns

## Git / implementation notes

- Keep changes small and self-contained; prefer feature branch `feat/5-3-dashboard-notifications`.
- Add `baseline_commit` once ready (set to current HEAD before merge).

## Latest tech considerations (project pinned)

- Respect locked stack versions from `project-context.md` (React 19, Vite 8, Tailwind v4, Framer Motion 12). Ne pas upgrader.

## Project context references

- Voir: _bmad-output/project-context.md — règles critiques pour imports, theming, navigation et storage.

## Story completion status

- Status: `ready-for-dev`
- Completion note: "Ultimate context engine analysis completed - comprehensive developer guide created"
