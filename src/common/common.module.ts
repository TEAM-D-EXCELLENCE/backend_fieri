import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage/storage.service';
import { MailService } from './mail/mail.service';
import { PdfService } from './pdf/pdf.service';

/**
 * Services transverses (stockage de fichiers, e-mail, génération PDF) partagés
 * par les modules Soutiens et Attestations. Global pour éviter les réimports.
 */
@Global()
@Module({
  providers: [StorageService, MailService, PdfService],
  exports: [StorageService, MailService, PdfService],
})
export class CommonModule {}
