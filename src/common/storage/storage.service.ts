import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, isAbsolute } from 'path';

/**
 * Stockage de fichiers (PDF générés, images de signature…).
 *
 * Écrit sur le système de fichiers local sous un répertoire configurable et
 * renvoie une URL publique (servie par `useStaticAssets` sous `/uploads`).
 * En production cloud (Vercel/S3), remplacer l'implémentation sans changer
 * l'interface consommée par les services métier.
 *
 * Config :
 *  - FILE_STORAGE_DIR : répertoire racine (défaut : `<cwd>/uploads`)
 *  - PUBLIC_BASE_URL  : base des URLs publiques (défaut : http://localhost:3000)
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

  /** Répertoire racine servi statiquement (consommé par `main.ts`). */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Persiste un buffer et renvoie sa clé (`<subdir>/<filename>`) et son URL
   * publique.
   */
  async save(
    buffer: Buffer,
    opts: { subdir: string; filename: string },
  ): Promise<{ key: string; url: string }> {
    const safeSub = opts.subdir.replace(/[^a-zA-Z0-9/_-]/g, '');
    const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const dir = join(this.baseDir, safeSub);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, safeName), buffer);
    const key = `${safeSub}/${safeName}`;
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

  /** Lit le contenu d'un fichier précédemment stocké, via son URL publique. */
  async readByUrl(url: string): Promise<Buffer | null> {
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
