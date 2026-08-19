import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const NAVY = '#0B2545';
const GOLD = '#C9A227';
const GREY = '#6B7280';

export interface SupportAgreementData {
  donorName: string;
  donorEmail: string;
  physicalType: string;
  description: string;
  universityName?: string;
  fingerprintHash: string;
  signedAt: Date;
}

export interface CertificateData {
  recipientName: string;
  title: string;
  category: string;
  certificateId: string;
  issuerName: string;
  universityName?: string;
  issuedAt: Date;
  signatureImage?: Buffer;
}

@Injectable()
export class PdfService {
  /** Rend un document pdfkit en un Buffer complet. */
  private renderToBuffer(
    build: (doc: PDFKit.PDFDocument) => void,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 56 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        build(doc);
        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Entente de soutien matériel signée par « scan d'empreinte » : le hash de
   * consentement fait office de signature cryptographique officielle.
   */
  async generateSupportAgreement(data: SupportAgreementData): Promise<Buffer> {
    return this.renderToBuffer((doc) => {
      const left = doc.page.margins.left;
      const width =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // En-tête
      doc
        .fillColor(NAVY)
        .fontSize(26)
        .font('Helvetica-Bold')
        .text('FIERI', left, 60);
      doc
        .fillColor(GOLD)
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('ENTENTE DE SOUTIEN', left, 92);
      doc
        .moveTo(left, 116)
        .lineTo(left + width, 116)
        .strokeColor(GOLD)
        .lineWidth(2)
        .stroke();

      doc.moveDown(2);
      doc
        .fillColor('#111827')
        .font('Helvetica')
        .fontSize(11)
        .text(
          "La présente entente formalise l'offre de soutien matériel ci-dessous " +
            'au bénéfice de la communauté FIERI' +
            (data.universityName ? ` — ${data.universityName}.` : '.'),
          left,
          140,
          { width, align: 'justify' },
        );

      const rows: Array<[string, string]> = [
        ['Partenaire', data.donorName],
        ['E-mail', data.donorEmail],
        ['Nature du soutien', data.physicalType],
        ['Description', data.description],
      ];
      if (data.universityName) {
        rows.push(['Université bénéficiaire', data.universityName]);
      }

      let y = 190;
      for (const [label, value] of rows) {
        doc
          .fillColor(GREY)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(label.toUpperCase(), left, y, { width: 150 });
        doc
          .fillColor('#111827')
          .font('Helvetica')
          .fontSize(11)
          .text(value, left + 160, y, { width: width - 160 });
        y = doc.y + 12;
      }

      // Bloc signature (hash d'empreinte)
      const boxY = Math.max(y + 20, 470);
      doc
        .roundedRect(left, boxY, width, 130, 6)
        .strokeColor(NAVY)
        .lineWidth(1)
        .stroke();
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('SIGNATURE NUMÉRIQUE — SCAN D’EMPREINTE', left + 16, boxY + 14);
      doc
        .fillColor('#111827')
        .font('Helvetica')
        .fontSize(10)
        .text(
          `Signé numériquement par scan d'empreinte le ${this.formatDate(
            data.signedAt,
          )}.`,
          left + 16,
          boxY + 38,
          { width: width - 32 },
        );
      doc
        .fillColor(GREY)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('ID DE TRANSACTION (SHA-256)', left + 16, boxY + 62);
      doc
        .fillColor(NAVY)
        .font('Courier')
        .fontSize(9)
        .text(data.fingerprintHash, left + 16, boxY + 76, {
          width: width - 32,
        });

      doc
        .fillColor(GREY)
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text(
          'Ce hash constitue une empreinte cryptographique du consentement. ' +
            'Toute altération du contenu invaliderait la signature.',
          left,
          boxY + 145,
          { width },
        );
    });
  }

  /** Attestation officielle personnalisée avec signature manuscrite apposée. */
  async generateCertificate(data: CertificateData): Promise<Buffer> {
    return this.renderToBuffer((doc) => {
      const left = doc.page.margins.left;
      const width =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Bordure décorative
      doc
        .rect(28, 28, doc.page.width - 56, doc.page.height - 56)
        .lineWidth(3)
        .strokeColor(NAVY)
        .stroke();
      doc
        .rect(36, 36, doc.page.width - 72, doc.page.height - 72)
        .lineWidth(1)
        .strokeColor(GOLD)
        .stroke();

      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(30)
        .text('FIERI', left, 80, { align: 'center', width });
      doc
        .fillColor(GOLD)
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('ATTESTATION OFFICIELLE', left, 120, {
          align: 'center',
          width,
        });
      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(11)
        .text(`Catégorie : ${data.category}`, left, 150, {
          align: 'center',
          width,
        });

      doc
        .fillColor('#111827')
        .font('Helvetica')
        .fontSize(13)
        .text('Nous certifions par la présente que', left, 210, {
          align: 'center',
          width,
        });
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(24)
        .text(data.recipientName, left, 236, { align: 'center', width });

      doc
        .fillColor('#111827')
        .font('Helvetica')
        .fontSize(13)
        .text('a obtenu la distinction suivante :', left, 282, {
          align: 'center',
          width,
        });
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(data.title, left, 306, { align: 'center', width });

      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(11)
        .text(`Délivrée le ${this.formatDate(data.issuedAt)}`, left, 356, {
          align: 'center',
          width,
        });

      // Bloc signature (image manuscrite apposée)
      const sigX = left + width - 220;
      const sigY = 430;
      if (data.signatureImage) {
        try {
          doc.image(data.signatureImage, sigX, sigY, { fit: [200, 70] });
        } catch {
          // Image illisible : on poursuit sans bloquer l'émission.
        }
      }
      doc
        .moveTo(sigX, sigY + 78)
        .lineTo(sigX + 200, sigY + 78)
        .strokeColor(NAVY)
        .lineWidth(1)
        .stroke();
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(data.issuerName, sigX, sigY + 84, {
          width: 200,
          align: 'center',
        });
      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(9)
        .text(
          data.universityName
            ? `Chef Universitaire — ${data.universityName}`
            : 'Chef Universitaire',
          sigX,
          sigY + 100,
          { width: 200, align: 'center' },
        );

      // Identifiant unique du certificat
      doc
        .fillColor(GREY)
        .font('Courier')
        .fontSize(9)
        .text(
          `Identifiant du certificat : ${data.certificateId}`,
          left,
          doc.page.height - 80,
          { align: 'center', width },
        );
    });
  }
}
