import { Test, TestingModule } from '@nestjs/testing';
import { CertificateService } from './certificate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../../common/mail/mail.service';
import { PdfService } from '../../common/pdf/pdf.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CertificateService', () => {
  let service: CertificateService;
  let pdfService: PdfService;

  const mockPrisma = {
    member: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    university: {
      findUnique: jest.fn(),
    },
    universityPost: {
      findUnique: jest.fn(),
    },
    certificate: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  const mockStorage = {
    save: jest.fn().mockResolvedValue({ url: 'http://localhost:3000/uploads/certificates/attestation-1.pdf' }),
    readByUrl: jest.fn().mockResolvedValue(null),
  };

  const mockMail = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        PdfService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    pdfService = module.get<PdfService>(PdfService);
    jest.clearAllMocks();
  });

  it('should generate a valid PDF buffer from PdfService', async () => {
    const pdfBuffer = await pdfService.generateCertificate({
      recipientName: 'Jean Kossi',
      title: 'Certification Excel en IA',
      category: 'FORMATION',
      certificateId: 'cert-123',
      issuerName: 'Dr. Mensah',
      universityName: "Université d'Abomey-Calavi (UAC)",
      issuedAt: new Date(),
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  it('should issue a certificate successfully', async () => {
    mockPrisma.member.findUnique
      .mockResolvedValueOnce({ id: 1, firstname: 'Chef', lastname: 'Uni', signatureUrl: '/uploads/signatures/sig.png' })
      .mockResolvedValueOnce({ id: 2, firstname: 'Jean', lastname: 'Kossi', email: 'jean@example.com' });
    
    mockPrisma.university.findUnique.mockResolvedValueOnce({ id: 1, name: 'UAC' });
    mockPrisma.certificate.create.mockResolvedValueOnce({ id: 'cert-001', recipientId: 2, issuerId: 1, title: 'Attestation IA', category: 'FORMATION', fileUrl: '' });
    mockPrisma.certificate.update.mockResolvedValueOnce({ id: 'cert-001', recipientId: 2, issuerId: 1, title: 'Attestation IA', category: 'FORMATION', fileUrl: '/uploads/cert.pdf', createdAt: new Date() });

    const result = await service.issueCertificate(1, { recipientId: 2, title: 'Attestation IA', category: 'FORMATION' }, 1);

    expect(result.success).toBe(true);
    expect(result.data.fileUrl).toBe('/uploads/cert.pdf');
    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });
});
