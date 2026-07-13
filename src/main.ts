import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, isAbsolute } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // `rawBody: true` conserve le corps brut de la requête (Buffer) afin de
  // pouvoir valider la signature HMAC des webhooks de paiement.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Sert les fichiers générés (attestations PDF, ententes, signatures) sous
  // `/uploads`. Doit rester aligné avec `StorageService`.
  const storageDir = process.env.FILE_STORAGE_DIR;
  const uploadsDir =
    storageDir && isAbsolute(storageDir)
      ? storageDir
      : join(process.cwd(), storageDir ?? 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  // Autorise le frontend local et le frontend de production
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'https://fieriresearch.vercel.app',
      'https://fier2.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
