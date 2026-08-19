import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage/storage.service';
import { MailService } from './mail/mail.service';
import { PdfService } from './pdf/pdf.service';
import { ClubScopeService } from './club-scope/club-scope.service';

/**
 * Services transverses (stockage de fichiers, e-mail, génération PDF, portée
 * universitaire d'un club) partagés par plusieurs modules et par les gardes
 * d'autorisation. Global pour éviter les réimports.
 */
@Global()
@Module({
  providers: [StorageService, MailService, PdfService, ClubScopeService],
  exports: [StorageService, MailService, PdfService, ClubScopeService],
})
export class CommonModule {}
