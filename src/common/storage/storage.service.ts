import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, isAbsolute } from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Stockage de fichiers (PDF générés, images de signature…).
 *
 * Deux modes :
 *  - Si S3_BUCKET est défini : stockage S3-compatible (MinIO, Cloudflare R2…)
 *    via l'API S3. `save()` renvoie une URL présignée GET (expiration 1 h),
 *    `readByUrl()` lit l'objet via GetObjectCommand. Indispensable sur
 *    Vercel où le FS local est éphémère.
 *  - Sinon : système de fichiers local sous un répertoire configurable et
 *    URL publique servie par `useStaticAssets` sous `/uploads` (dev local).
 *
 * Config :
 *  - FILE_STORAGE_DIR : répertoire racine (défaut : `<cwd>/uploads`)
 *  - PUBLIC_BASE_URL  : base des URLs publiques (défaut : http://localhost:3000)
 *  - S3_ENDPOINT            : endpoint S3-compatible (optionnel, MinIO/R2)
 *  - S3_REGION              : région (défaut : auto — R2)
 *  - S3_BUCKET              : nom du bucket (définit le mode S3)
 *  - S3_ACCESS_KEY_ID       : clé d'accès
 *  - S3_SECRET_ACCESS_KEY   : clé secrète
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseDir =
    process.env.FILE_STORAGE_DIR && isAbsolute(process.env.FILE_STORAGE_DIR)
      ? process.env.FILE_STORAGE_DIR
      : join(process.cwd(), process.env.FILE_STORAGE_DIR ?? 'uploads');
  private readonly publicBaseUrl = (
    process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000'
  ).replace(/\/+$/, '');
  private readonly urlPrefix = '/uploads';
  private readonly bucket = process.env.S3_BUCKET ?? '';
  private readonly s3Client = this.bucket
    ? new S3Client({
        region: process.env.S3_REGION ?? 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
        },
      })
    : null;

  /** Répertoire racine servi statiquement (consommé par `main.ts`). */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Persiste un buffer et renvoie sa clé (`<subdir>/<filename>`) et son URL
   * publique (présignée en mode S3, `/uploads/...` en mode FS).
   */
  async save(
    buffer: Buffer,
    opts: { subdir: string; filename: string },
  ): Promise<{ key: string; url: string }> {
    // Sanitisation anti path traversal (valable dans les deux modes).
    const safeSub = opts.subdir.replace(/[^a-zA-Z0-9/_-]/g, '');
    const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const key = `${safeSub}/${safeName}`
      .replace(/\/{2,}/g, '/')
      .replace(/^\/+/, '');

    if (this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'application/octet-stream',
        }),
      );
      const url = await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 3600 },
      );
      return { key, url };
    }

    const dir = join(this.baseDir, safeSub);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, safeName), buffer);
    return { key, url: `${this.publicBaseUrl}${this.urlPrefix}/${key}` };
  }

  /** Reconstruit le chemin local à partir d'une URL publique produite ici. */
  private pathFromUrl(url: string): string | null {
    const marker = `${this.urlPrefix}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) {
      return null;
    }
    const key = url
      .slice(idx + marker.length)
      // Empêche toute remontée de répertoire.
      .replace(/\.\.(\/|\\)/g, '');
    return join(this.baseDir, key);
  }

  /** Extrait la clé S3 d'une URL présignée (path-style ou virtual-host). */
  private keyFromS3Url(url: string): string | null {
    try {
      const parsed = new URL(url);
      parsed.search = '';
      let pathname = decodeURIComponent(parsed.pathname);
      if (pathname.startsWith(`/${this.bucket}/`)) {
        pathname = pathname.slice(this.bucket.length + 2);
      } else if (parsed.hostname.startsWith(`${this.bucket}.`)) {
        pathname = pathname.replace(/^\//, '');
      } else {
        return null;
      }
      pathname = pathname
        // Empêche toute remontée de répertoire.
        .replace(/\.\.(\/|\\)/g, '')
        .replace(/^\/+/, '');
      return pathname || null;
    } catch {
      return null;
    }
  }

  /**
   * Lit un fichier par sa CLÉ (`<subdir>/<nom>`), et non par son URL.
   *
   * En mode S3, `save()` renvoie une URL présignée qui expire au bout d'une
   * heure : parfaitement adaptée à un PDF qu'on télécharge dans la foulée,
   * inutilisable pour une photo de profil ou l'illustration d'un article, que
   * l'on range en base et que l'on réaffiche des mois plus tard. Les images
   * sont donc servies par une route stable qui lit ici, par clé.
   */
  async readByKey(key: string): Promise<Buffer | null> {
    const safeKey = key.replace(/\.\.(\/|\\)/g, '').replace(/^\/+/, '');
    if (!safeKey) {
      return null;
    }

    if (this.s3Client) {
      try {
        const res = await this.s3Client.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: safeKey }),
        );
        const bytes = res.Body ? await res.Body.transformToByteArray() : null;
        return bytes ? Buffer.from(bytes) : null;
      } catch (err) {
        this.logger.warn(
          `Objet S3 introuvable pour la clé ${safeKey} : ${(err as Error).message}`,
        );
        return null;
      }
    }

    try {
      return await fs.readFile(join(this.baseDir, safeKey));
    } catch {
      return null;
    }
  }

  /** Lit le contenu d'un fichier précédemment stocké, via son URL publique. */
  async readByUrl(url: string): Promise<Buffer | null> {
    if (this.s3Client) {
      const key = this.keyFromS3Url(url);
      if (!key) {
        return null;
      }
      try {
        const res = await this.s3Client.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        const bytes = res.Body ? await res.Body.transformToByteArray() : null;
        return bytes ? Buffer.from(bytes) : null;
      } catch (err) {
        this.logger.warn(
          `Objet S3 introuvable pour l'URL ${url} : ${(err as Error).message}`,
        );
        return null;
      }
    }

    const path = this.pathFromUrl(url);
    if (!path) {
      return null;
    }
    try {
      return await fs.readFile(path);
    } catch (err) {
      this.logger.warn(
        `Fichier introuvable pour l'URL ${url} : ${(err as Error).message}`,
      );
      return null;
    }
  }
}
