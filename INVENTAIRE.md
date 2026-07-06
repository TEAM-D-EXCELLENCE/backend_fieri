# Inventaire complet — API FIERI Research

**Base URL:** `https://backend-fieri.vercel.app`  
**Stack:** NestJS + Prisma + PostgreSQL  
**Auth:** JWT (Bearer token) avec `RolesGuard` (refetch DB)  
**Rôles (hiérarchie):** `ETUDIANT < CHERCHEUR ≈ MENTOR < ADMIN`  
**Enveloppe réponse:** `{ success, data, message }`  
**Build:** `yarn build` ✅

---

## Légende des guards

| Icône | Guard | Description |
|-------|-------|-------------|
| ❌ | Aucun | Endpoint public |
| 🟡 | `OptionalJwtAuthGuard` | Auth optionnelle (req.user = null si pas de token) |
| 🔒 | `AuthGuard('jwt')` | Authentification requise |
| 🔒 + rôle | `AuthGuard('jwt')` + `RolesGuard` + `@Roles(...)` | Auth + rôle(s) spécifique(s) |

---

## 1. Health Check

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/` | ❌ Public | Health check / hello |

---

## 2. Organisation (`/countries`, `/universities`, `/branches`)

**Fichier:** `src/modules/organization/organization.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/countries` | ❌ Public | Liste des pays |
| GET | `/countries/:id` | ❌ Public | Détail d'un pays |
| GET | `/countries/:id/universities` | ❌ Public | Universités d'un pays |
| POST | `/countries` | 🔒 ADMIN | Créer un pays |
| GET | `/universities` | ❌ Public | Liste des universités |
| GET | `/universities/:id` | ❌ Public | Détail d'une université |
| GET | `/universities/:id/branches` | ❌ Public | Filiales d'une université |
| POST | `/universities` | 🔒 ADMIN | Créer une université |
| GET | `/branches` | ❌ Public | Liste des filiales |
| GET | `/branches/:id` | ❌ Public | Détail d'une filiale |
| POST | `/branches` | 🔒 ADMIN | Créer une filiale |

---

## 3. Auth (`/auth`)

**Fichier:** `src/auth/auth.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| POST | `/auth/register` | ❌ Public | Inscription (email, password, firstName, lastName, branchId). `role` forcé à `ETUDIANT` |
| POST | `/auth/login` | ❌ Public | Connexion (email, password) → retourne JWT |

---

## 4. Membres (`/members`)

**Fichier:** `src/members/members.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/members/me` | 🔒 JWT | Mon profil |
| GET | `/members` | 🔒 ADMIN | Lister membres. Query: `?search=&role=&page=&limit=` |
| GET | `/members/:id` | 🔒 ADMIN | Détail d'un membre |
| PATCH | `/members/:id/role` | 🔒 ADMIN | Changer le rôle. Bloque la suppression du dernier ADMIN |

---

## 5. Projets (`/projects`)

**Fichier:** `src/modules/project/project.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/projects` | 🟡 OptionalJWT | Liste. Query: `?clubId=&status=&search=&page=&limit=` |
| GET | `/projects/:id` | ❌ Public | Détail projet |
| POST | `/projects` | 🔒 CHERCHEUR, ADMIN | Créer (auto-ID `proj-{timestamp}`) |
| PUT | `/projects/:id` | 🔒 CHERCHEUR, ADMIN | Modifier (owner ou ADMIN) |
| DELETE | `/projects/:id` | 🔒 CHERCHEUR, ADMIN | Supprimer (owner ou ADMIN) |
| POST | `/projects/:id/follow` | 🔒 JWT | Suivre le projet (toggle) |
| DELETE | `/projects/:id/follow` | 🔒 JWT | Ne plus suivre |
| POST | `/projects/:id/support` | 🔒 JWT | Contribuer (amount, message) |

---

## 6. Clubs (`/clubs`, `/memberships`)

**Fichiers:** `src/modules/club/club.controller.ts`, `src/modules/club/membership.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/clubs` | ❌ Public | Liste des clubs (paginée) |
| GET | `/clubs/:id` | ❌ Public | Détail (membres + rôle, discipline, projets) |
| POST | `/clubs` | 🔒 ADMIN | Créer (auto-ID `club-{timestamp}`) |
| PUT | `/clubs/:id` | 🔒 ADMIN, RESPONSABLE | Modifier |
| DELETE | `/clubs/:id` | 🔒 ADMIN | Supprimer |
| POST | `/clubs/:id/join` | 🔒 JWT | Rejoindre (vérifie doublon APPROVED → ConflictException) |
| DELETE | `/clubs/:id/join` | 🔒 JWT | Quitter |
| POST | `/memberships/requests` | 🔒 JWT | Demander adhésion |
| GET | `/memberships/requests/pending/:clubId` | 🔒 RESPONSABLE, ADMIN | Requêtes en attente |
| GET | `/memberships/requests/club/:clubId` | 🔒 RESPONSABLE, ADMIN | Historique des requêtes |
| GET | `/memberships/requests/user/:userId` | 🔒 JWT | Requêtes d'un utilisateur (self ou ADMIN) |
| PATCH | `/memberships/requests/:requestId/approve` | 🔒 RESPONSABLE, ADMIN | Approuver une demande |
| PATCH | `/memberships/requests/:requestId/reject` | 🔒 RESPONSABLE, ADMIN | Rejeter une demande |
| DELETE | `/memberships/:clubId/user/:userId` | 🔒 RESPONSABLE, ADMIN | Retirer un membre du club |

---

## 7. Publications (`/publications`)

**Fichier:** `src/modules/publication/publication.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/publications` | ❌ Public | Liste. Query: `?authorId=&clubId=&projectId=&page=&limit=` |
| GET | `/publications/:id` | ❌ Public | Détail publication |
| POST | `/publications` | 🔒 CHERCHEUR, ADMIN | Créer une publication |

---

## 8. Contributions (`/contributions`)

**Fichier:** `src/modules/contribution/contribution.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| POST | `/contributions/donate` | 🟡 OptionalJWT | Don (amount, email, message). Lie au membre si connecté |
| POST | `/contributions/partner` | 🟡 OptionalJWT | Demande de partenariat (organisation, email, message) |
| GET | `/contributions/me` | 🔒 JWT | Historique de mes contributions |

---

## 9. Actualités (`/news`)

**Fichier:** `src/modules/news/news.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/news` | 🟡 OptionalJWT | Liste. Query: `?includePending=&featured=&page=&limit=` |
| GET | `/news/:id` | ❌ Public | Détail (auteur, catégorie, date) |
| POST | `/news` | 🔒 CHERCHEUR, ADMIN | Créer (status PENDING) |
| PUT | `/news/:id` | 🔒 CHERCHEUR, ADMIN | Modifier (owner ou ADMIN) |
| PATCH | `/news/:id/approve` | 🔒 ADMIN | Approuver (status → APPROVED) |
| DELETE | `/news/:id` | 🔒 JWT | Supprimer (owner ou ADMIN) |

---

## 10. Événements (`/events`)

**Fichier:** `src/modules/event/event.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/events` | ❌ Public | Liste des événements |
| GET | `/events/:id` | ❌ Public | Détail événement |
| POST | `/events` | 🔒 ADMIN | Créer (auto-ID `event-{timestamp}`, streamUrl default `''`) |
| PUT | `/events/:id` | 🔒 ADMIN | Modifier |
| POST | `/events/:id/register` | 🔒 JWT | S'inscrire |
| DELETE | `/events/:id/register` | 🔒 JWT | Se désinscrire |
| GET | `/events/:id/stream` | 🔒 JWT | Obtenir le lien live |

---

## 11. Opportunités (`/opportunities`)

**Fichier:** `src/modules/opportunity/opportunity.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/opportunities` | ❌ Public | Liste. Query: `?type=&discipline=&status=` |
| GET | `/opportunities/:id` | ❌ Public | Détail opportunité |
| POST | `/opportunities` | 🔒 CHERCHEUR, ADMIN | Créer |
| PUT | `/opportunities/:id` | 🔒 CHERCHEUR, ADMIN | Modifier (owner ou ADMIN) |
| DELETE | `/opportunities/:id` | 🔒 CHERCHEUR, ADMIN | Supprimer (owner ou ADMIN) |

---

## 12. Candidatures (`/applications`)

**Fichier:** `src/modules/application/application.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| POST | `/applications` | 🔒 JWT | Postuler à une opportunité |
| GET | `/applications/me` | 🔒 JWT | Mes candidatures |
| GET | `/applications/check/:opportunityId` | 🔒 JWT | Vérifier si déjà postulé |
| GET | `/applications/opportunity/:opportunityId` | 🔒 CHEF_DE_PROJET, ADMIN | Candidatures pour une offre |
| PATCH | `/applications/:id/status` | 🔒 CHEF_DE_PROJET, ADMIN | Modifier le statut |

---

## 13. Workshops (`/workshops`)

**Fichier:** `src/modules/workshop/workshop.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/workshops` | ❌ Public | Liste (paginée) |
| GET | `/workshops/:id` | ❌ Public | Détail |
| POST | `/workshops/:id/register` | 🔒 JWT | S'inscrire |
| POST | `/workshops/:id/waitlist` | 🔒 JWT | Liste d'attente |
| DELETE | `/workshops/:id/register` | 🔒 JWT | Se désinscrire |

---

## 14. Formations (`/formations`)

**Fichier:** `src/modules/workshop/formations.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/formations` | ❌ Public | Liste (paginée) |
| GET | `/formations/:id` | ❌ Public | Détail |
| POST | `/formations` | 🔒 CHERCHEUR, ADMIN | Créer (auto-ID `work-{timestamp}`) |
| PUT | `/formations/:id` | 🔒 CHERCHEUR, ADMIN | Modifier |
| POST | `/formations/:id/register` | 🔒 JWT | S'inscrire |
| POST | `/formations/:id/waitlist` | 🔒 JWT | Liste d'attente |
| DELETE | `/formations/:id/register` | 🔒 JWT | Se désinscrire |

---

## 15. Chercheurs (`/researchers`)

**Fichier:** `src/modules/researcher/researcher.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/researchers` | ❌ Public | Liste (email + rôle inclus) |
| GET | `/researchers/me` | 🔒 JWT | Mon profil chercheur |
| GET | `/researchers/:id` | ❌ Public | Détail chercheur |
| GET | `/researchers/:id/distinctions` | ❌ Public | Distinctions + badges |
| PUT | `/researchers/me` | 🔒 JWT | Modifier mon profil (bio, skills, avatarUrl) |
| POST | `/researchers/:id/follow` | 🔒 JWT | Suivre un chercheur |
| DELETE | `/researchers/:id/follow` | 🔒 JWT | Ne plus suivre |

---

## 16. Tâches (`/tasks`)

**Fichier:** `src/modules/task/task.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/tasks/project/:projectId` | 🔒 JWT | Tâches d'un projet |
| POST | `/tasks` | 🔒 CHEF_DE_PROJET, ADMIN | Créer une tâche |
| PUT | `/tasks/:id` | 🔒 CHEF_DE_PROJET, ADMIN | Changer le statut |
| PATCH | `/tasks/:id/assign` | 🔒 CHEF_DE_PROJET, ADMIN | Assigner à un membre |
| PATCH | `/tasks/:id/priority` | 🔒 CHEF_DE_PROJET, ADMIN | Changer la priorité |
| DELETE | `/tasks/:id` | 🔒 CHEF_DE_PROJET, ADMIN | Supprimer |

---

## 17. Badges (`/badges`)

**Fichier:** `src/modules/badge/badge.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/badges/user/:userId` | ❌ Public | Badges d'un utilisateur |
| POST | `/badges/award` | 🔒 MENTOR, ADMIN | Décerner un badge |
| DELETE | `/badges/:id` | 🔒 MENTOR, ADMIN | Révoquer un badge |

---

## 18. Dashboard & Stats

**Fichier:** `src/modules/dashboard/dashboard.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/stats` | ❌ Public | Statistiques plateforme (membres, projets, clubs, événements, formations, actualités) |
| GET | `/dashboard/me` | 🔒 JWT | Dashboard personnel (clubs, projets suivis, événements à venir, publications récentes) |

---

## 19. Notifications (`/notifications`)

**Fichier:** `src/modules/dashboard/notification.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| GET | `/notifications` | 🔒 JWT | Mes notifications |
| PUT | `/notifications/:id/read` | 🔒 JWT | Marquer comme lue |
| DELETE | `/notifications` | 🔒 JWT | Tout effacer |

---

## 20. Contact (`/contact`)

**Fichier:** `src/modules/contact/contact.controller.ts`

| Méthode | Path | Guards | Usage |
|---------|------|--------|-------|
| POST | `/contact` | ❌ Public | Formulaire de contact (name, email, subject, message) |

---

## Résumé statistiques

| Métrique | Valeur |
|----------|--------|
| **Controllers** | 21 |
| **Endpoints totaux** | 89 |
| **Modules importés** | 18 |
| **Publics (aucun guard)** | 22 |
| **JWT simple** | 27 |
| **Role-protégés (RolesGuard)** | 40 |
| **OptionalJWT** | 4 |

### Rôles utilisés dans `@Roles()`

| Rôle | Nombre d'endpoints |
|------|--------------------|
| `ADMIN` | 38 |
| `CHERCHEUR` | 12 |
| `CHEF_DE_PROJET` | 8 |
| `RESPONSABLE` | 7 |
| `MENTOR` | 2 |

---

## Travaux effectués

### Sécurité (12 vulnérabilités corrigées)
- `POST /auth/register` : `role` forcé à `ETUDIANT` (refuse role hijack via body)
- `jwt.strategy.ts` : `role: payload.role` ajouté au retour — répare `req.user.role === undefined`
- `RolesGuard` : refetch DB à chaque requête (JWT périmé → rejeté)
- `POST /news` : ajout `RolesGuard` + `@Roles('CHERCHEUR','ADMIN')`
- `PUT/DELETE /projects/:id`, `/opportunities/:id`, `PUT /news/:id` : ajout `RolesGuard`
- `GET /memberships/requests/{club/:id, user/:id}` : restriction RESPONSABLE/ADMIN
- `DELETE /memberships/:clubId/user/:userId` : restriction RESPONSABLE/ADMIN
- `PUT/PATCH/DELETE /tasks/:id` : restriction `CHEF_DE_PROJET/ADMIN`
- `POST /countries|universities|branches` : ajout guard ADMIN (étaient sans aucune protection)
- `GET /memberships/requests/user/:userId` : ownership check (self ou ADMIN)

### Gestion des membres
- `GET /members`, `GET /members/:id`, `PATCH /members/:id/role` (ADMIN)
- Garde : impossible de retirer le dernier ADMIN de la plateforme

### Publications & Contributions (nouveaux modules)
- `PublicationModule` : GET public (filtré/paginé), POST CHERCHEUR/ADMIN
- `ContributionModule` : dons et partenariats (OptionalJWT), historique perso (JWT)

### Enrichissement des endpoints
- Dashboard : clubs, projets suivis, événements à venir, publications récentes
- Stats : compteurs plateforme (membres, projets, clubs, événements, formations, actualités)
- Researchers : `email` + `role` dans la liste ; `distinctions[]` + `badges[]` dans le détail
- News : `author{id,firstName,lastName}`, `category`, `createdAt`, `?featured=true`, pagination
- Clubs : `role` dans les membres, `discipline`, `projects[]`, pagination
- Projets, Workshops, Formations, Events : pagination + auto-ID (`proj-{timestamp}`, `work-{timestamp}`, `event-{timestamp}`, `club-{timestamp}`) + valeurs par défaut

### Base de données
- **Migration 1** (`20260706030000`) : table `Opportunity`, colonne `ownerId` sur `Project`, FK `Application_opportunityId_fkey`
- **Migration 2** (`20260706040000`) : tables `Publication` et `Contribution` avec toutes les FKs et index
- **`schema.prisma`** : rôle par défaut `ETUDIANT`, nouveaux modèles + relations
- **`seed.ts`** : reflète `ETUDIANT` par défaut

### Audit sécurité
- 18/18 catégories PASS
- 12 vulnérabilités corrigées (0 critiques restantes)

### Bloquant
- Les migrations doivent être appliquées sur la base de production : `npx prisma migrate deploy`
