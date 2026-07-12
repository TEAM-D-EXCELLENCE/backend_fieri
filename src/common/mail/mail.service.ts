import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}

/**
 * Envoi d'e-mails via SMTP (Nodemailer).
 *
 * Dégradation contrôlée : si le SMTP n'est pas configuré (variables absentes),
 * l'envoi est journalisé et ignoré sans faire échouer la requête métier — le
 * document généré reste stocké et disponible.
 *
 * Config : SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, MAIL_FROM
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from =
    process.env.MAIL_FROM ?? 'FIERI <no-reply@fieri.local>';
  private readonly transporter: nodemailer.Transporter | null;

  constructor() {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.transporter = null;
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
    });
  }

  /** Envoie un e-mail. Renvoie `true` si effectivement transmis au SMTP. */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP non configuré — e-mail non envoyé (dest: ${String(
          options.to,
        )}, sujet: "${options.subject}").`,
      );
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });
      this.logger.log(
        `E-mail envoyé à ${String(options.to)} — "${options.subject}".`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Échec d'envoi d'e-mail à ${String(options.to)} : ${
          (err as Error).message
        }`,
        (err as Error).stack,
      );
      return false;
    }
  }
}
