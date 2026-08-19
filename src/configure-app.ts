import { NestExpressApplication } from '@nestjs/platform-express';
import { join, isAbsolute } from 'path';

/**
 * Configuration commune aux deux modes d'exécution :
 *  - `main.ts` : serveur HTTP long-running (développement local, conteneur) ;
 *  - `serverless.ts` : fonction Vercel.
 *
 * Toute option applicative doit être ajoutée ici, jamais dans un seul des deux
 * points d'entrée, sous peine de divergence entre local et production.
 */
export function configureApp(app: NestExpressApplication): void {
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
}
