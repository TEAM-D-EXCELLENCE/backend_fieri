import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

/**
 * Point d'entrée serverless (Vercel).
 *
 * Contrairement à `main.ts`, on n'appelle jamais `app.listen()` : Vercel fournit
 * lui-même le serveur HTTP et nous passe chaque requête. On se contente donc
 * d'initialiser Nest sur une instance Express que l'on rend à la plateforme.
 *
 * L'instance est mémorisée au niveau du module : une lambda « chaude » réutilise
 * l'application déjà initialisée (et le pool Prisma) au lieu de tout reconstruire
 * à chaque requête.
 */
let serverPromise: Promise<express.Express> | undefined;

async function createServer(): Promise<express.Express> {
  const expressApp = express();

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
    // Aligné sur `main.ts` : nécessaire à la validation HMAC des webhooks.
    { rawBody: true },
  );

  configureApp(app);

  // `init()` et non `listen()` : on veut le graphe de dépendances prêt, pas un
  // port ouvert.
  await app.init();

  return expressApp;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  // On mémorise la *promesse*, pas le résultat : deux requêtes arrivant pendant
  // un démarrage à froid partagent la même initialisation au lieu d'en lancer
  // deux en parallèle.
  serverPromise ??= createServer();
  const server = await serverPromise;
  server(req, res);
}
