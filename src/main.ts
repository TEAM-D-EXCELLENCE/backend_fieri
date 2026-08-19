import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

/**
 * Point d'entrée du serveur HTTP long-running (développement local, conteneur).
 * En production sur Vercel, c'est `serverless.ts` qui prend le relais.
 */
async function bootstrap() {
  // `rawBody: true` conserve le corps brut de la requête (Buffer) afin de
  // pouvoir valider la signature HMAC des webhooks de paiement.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
