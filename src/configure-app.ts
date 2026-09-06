import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
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
  // Validation d'entrée à l'échelle de l'app. Ne s'active que sur les routes
  // dont le corps/params est typé par une CLASSE portant des décorateurs
  // class-validator : les anciens DTO déclarés en `interface` ont pour métatype
  // `Object` et sont ignorés par le pipe, donc rien ne casse pendant la
  // migration progressive.
  //  - whitelist  : RETIRE silencieusement les champs non déclarés dans le DTO.
  //                 Bloque le mass-assignment (ex. un `role` glissé à
  //                 l'inscription est effacé avant d'atteindre le service).
  //  - transform  : convertit vers les types attendus (ex. "3" → 3) et applique
  //                 les contraintes par champ (type, format, bornes → 400).
  //
  // `forbidNonWhitelisted` reste FALSE volontairement : sur une app déjà en
  // production, rejeter un corps parce qu'il porte un champ UI superflu
  // casserait des écrans existants. On préfère nettoyer que refuser. La
  // validation stricte des VALEURS (celle qui compte) reste entière.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // En-têtes de sécurité. `crossOriginResourcePolicy: cross-origin` est
  // requis pour que le frontend (domaine Vercel distinct) puisse afficher
  // les PDF/images servis sous /uploads.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

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
