# FIERI Research — Backend API (NestJS + Prisma)

API backend de la plateforme FIERI : gestion des chercheurs, clubs, projets, publications, événements, gouvernance, trésorerie, contributions et certification. Dépôt git séparé du front (racine du monorepo : `../README.md`).

## Stack technique

- **NestJS 11** — framework serveur TypeScript
- **Prisma 6** + **PostgreSQL** (Neon en production)
- **JWT (passport)** — authentification et rôles
- **bcrypt** — hachage des mots de passe
- **nodemailer** — envoi d'e-mails (SMTP)
- **pdfkit** — génération de PDF (certificats, attestations)
- **Multer** — upload de fichiers

## Prérequis

- Node ≥ 20
- PostgreSQL accessible (local ou Neon)
- Fichier `.env` créé depuis `.env.example`

## Démarrer

```bash
npm install
cp .env.example .env   # puis renseigner les valeurs
npx prisma migrate deploy   # ou : npx prisma db push (dev)
npm run start:dev           # http://localhost:3000
```

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run build` | Génère le client Prisma puis compile (Nest build) |
| `npm run start:dev` | Démarrage en watch (dev) |
| `npm run start:prod` | Démarrage du build (`node dist/main`) |
| `npm run lint` | Vérification ESLint |
| `npm run test` | Tests unitaires (Jest) |
| `npm run test:cov` | Tests unitaires avec couverture |
| `npm run test:e2e` | Tests e2e (nécessite une BDD live) |
| `npm run format` | Formatage Prettier |

## Variables d'environnement

Copier `.env.example` en `.env` puis renseigner chaque groupe :

- `JWT_SECRET` — secret de signature des JWT
- `DATABASE_URL` — chaîne de connexion PostgreSQL (Neon / local)
- **Genius Pay** — `GENIUS_PAY_*` : passerelle de paiement (API, clé, secret webhook, devise)
- **SMTP** — `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` : envoi d'e-mails (ignoré si vide)
- **Stockage fichiers** — `FILE_STORAGE_DIR`, `PUBLIC_BASE_URL` : répertoire des PDF générés et images
- `FRONTEND_URL` — URL du front pour les redirections de paiement

## Déploiement (Vercel)

Le build Vercel est géré par le script `vercel-build` : `prisma db push --accept-data-loss && prisma generate && nest build`.

En production, privilégier les migrations versionnées (`prisma/migrations/`) via `npx prisma migrate deploy` avant de démarrer l'application.

## Structure

```
src/
├── main.ts               # Bootstrap, CORS, validation globale
├── app.module.ts         # Module racine
├── auth/                 # Authentification JWT, rôles, guards
├── members/              # Gestion des membres
├── modules/              # Plus de 20 modules métier (club, event, project,
│                         # publication, governance, treasury, contribution…)
└── common/
    ├── mail/             # Nodemailer (SMTP)
    ├── pdf/              # pdfkit (certificats, attestations)
    └── storage/          # Stockage de fichiers (uploads)
prisma/
├── schema.prisma         # Schéma Prisma
├── migrations/           # Migrations versionnées
└── seed.ts               # Données de seed
```