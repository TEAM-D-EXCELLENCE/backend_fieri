import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from '../../common/storage/storage.service';

/** Une image reçue en multipart. */
export interface UploadedImage {
  buffer?: Buffer;
  mimetype?: string;
  size?: number;
  originalname?: string;
}

/** Types acceptés, et l'extension sous laquelle on les range. */
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Le même tableau, en sens inverse : sert à répondre le bon Content-Type. */
const MIMES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const MAX_BYTES = 3 * 1024 * 1024;
const SUBDIR = 'images';

// ── Documents (CV, pièces jointes) ──────────────────────────────────────────
// Le client signalait que la plateforme ne prenait pas les fichiers joints
// (CV en PDF notamment) : on n'acceptait qu'une URL saisie à la main.
const DOC_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
};
const DOC_MIMES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const DOC_MAX_BYTES = 8 * 1024 * 1024; // 8 Mo — un CV illustré passe.
const DOC_SUBDIR = 'documents';

/**
 * Dépôt d'images — l'illustration d'un article, une photo de profil.
 *
 * Jusqu'ici, les deux champs concernés attendaient une URL saisie à la main.
 * Demander « collez l'adresse d'une image » à quelqu'un qui a une photo sur son
 * téléphone, c'est lui demander de trouver d'abord un hébergeur : personne n'y
 * arrivait, et le client l'a signalé pour les deux écrans à la fois.
 *
 * ── Pourquoi une route de lecture, et pas l'URL du stockage ───────────────
 * En mode S3, `StorageService.save()` renvoie une URL présignée valable une
 * heure. Ranger cette URL en base — c'est ce que fait `avatarUrl` — donnerait
 * une photo de profil qui disparaît après une heure. On enregistre donc une
 * adresse stable, servie par `GET /files/images/:name`, qui relit par clé.
 */
@Injectable()
export class UploadsService {
  constructor(private readonly storage: StorageService) {}

  async saveImage(
    file?: UploadedImage,
  ): Promise<{ url: string; name: string }> {
    if (!file?.buffer || !file.size) {
      throw new BadRequestException('Aucune image reçue.');
    }
    const extension = EXTENSIONS[file.mimetype ?? ''];
    if (!extension) {
      throw new BadRequestException(
        'Format non accepté. Utilisez une image PNG, JPG, WEBP ou GIF.',
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Image trop volumineuse (3 Mo maximum).');
    }

    // Un nom tiré au sort : deux personnes qui envoient « photo.jpg » ne
    // doivent pas s'écraser l'une l'autre.
    const name = `${randomUUID()}.${extension}`;
    await this.storage.save(file.buffer, { subdir: SUBDIR, filename: name });

    const base = (
      process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    return { url: `${base}/files/${SUBDIR}/${name}`, name };
  }

  /** Relit une image déposée. `null` si elle n'existe pas. */
  async readImage(
    name: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    // Le nom est celui que nous avons produit : un UUID et une extension
    // connue. Tout le reste est refusé sans même toucher au stockage.
    const match = /^[0-9a-fA-F-]{36}\.(png|jpg|webp|gif)$/.exec(name);
    if (!match) {
      return null;
    }
    const buffer = await this.storage.readByKey(`${SUBDIR}/${name}`);
    if (!buffer) {
      return null;
    }
    return { buffer, contentType: MIMES[match[1]] };
  }

  /** Dépôt d'un document (CV, pièce jointe) — PDF, DOC ou DOCX. */
  async saveDocument(
    file?: UploadedImage,
  ): Promise<{ url: string; name: string }> {
    if (!file?.buffer || !file.size) {
      throw new BadRequestException('Aucun document reçu.');
    }
    const extension = DOC_EXTENSIONS[file.mimetype ?? ''];
    if (!extension) {
      throw new BadRequestException(
        'Format non accepté. Utilisez un PDF, DOC ou DOCX.',
      );
    }
    if (file.size > DOC_MAX_BYTES) {
      throw new BadRequestException('Document trop volumineux (8 Mo maximum).');
    }

    const name = `${randomUUID()}.${extension}`;
    await this.storage.save(file.buffer, {
      subdir: DOC_SUBDIR,
      filename: name,
    });

    const base = (
      process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    return { url: `${base}/files/${DOC_SUBDIR}/${name}`, name };
  }

  /** Relit un document déposé. `null` s'il n'existe pas. */
  async readDocument(
    name: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const match = /^[0-9a-fA-F-]{36}\.(pdf|doc|docx)$/.exec(name);
    if (!match) {
      return null;
    }
    const buffer = await this.storage.readByKey(`${DOC_SUBDIR}/${name}`);
    if (!buffer) {
      return null;
    }
    return { buffer, contentType: DOC_MIMES[match[1]] };
  }
}
