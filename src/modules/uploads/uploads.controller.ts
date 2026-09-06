import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';

@Controller()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Dépôt d'une image. Toute personne connectée peut en envoyer une : c'est le
   * geste d'un membre qui met sa photo de profil, pas un acte d'administration.
   * Le débit est bridé pour que le stockage ne serve pas de dépotoir.
   */
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image'))
  @Post('uploads/image')
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const data = await this.uploadsService.saveImage(file);
    return { success: true, message: 'Image enregistrée.', data };
  }

  /**
   * Lecture publique d'une image déposée : une illustration d'article et une
   * photo de profil s'affichent pour les visiteurs, y compris déconnectés.
   */
  @Get('files/images/:name')
  async readImage(@Param('name') name: string, @Res() res: Response) {
    const image = await this.uploadsService.readImage(name);
    if (!image) {
      throw new NotFoundException('Image introuvable.');
    }
    res.setHeader('Content-Type', image.contentType);
    // Le nom est un UUID : le contenu ne change jamais sous la même adresse.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(image.buffer);
  }

  /**
   * Dépôt d'un document (CV, pièce jointe) par un membre connecté — PDF/DOC/DOCX.
   * Répond au retour client : « la plateforme ne prend pas en charge les
   * fichiers joints », le CV n'acceptait qu'un lien.
   */
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('document'))
  @Post('uploads/document')
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    const data = await this.uploadsService.saveDocument(file);
    return { success: true, message: 'Document enregistré.', data };
  }

  /**
   * Lecture d'un document déposé. Le nom est un UUID non devinable — même
   * modèle d'accès que les images (un CV joint à une candidature est déjà
   * visible du chef de projet via son URL).
   */
  @Get('files/documents/:name')
  async readDocument(@Param('name') name: string, @Res() res: Response) {
    const doc = await this.uploadsService.readDocument(name);
    if (!doc) {
      throw new NotFoundException('Document introuvable.');
    }
    res.setHeader('Content-Type', doc.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(doc.buffer);
  }
}
