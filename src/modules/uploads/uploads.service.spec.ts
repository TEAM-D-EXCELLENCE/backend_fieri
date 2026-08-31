import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadsService, UploadedImage } from './uploads.service';
import { StorageService } from '../../common/storage/storage.service';

type ArgsSave = { subdir: string; filename: string };

const image = (patch: Partial<UploadedImage> = {}): UploadedImage => ({
  buffer: Buffer.from('des-octets'),
  mimetype: 'image/png',
  size: 10,
  originalname: 'photo.png',
  ...patch,
});

describe('UploadsService', () => {
  let service: UploadsService;
  let save: jest.Mock<
    Promise<{ key: string; url: string }>,
    [Buffer, ArgsSave]
  >;
  let readByKey: jest.Mock<Promise<Buffer | null>, [string]>;

  beforeEach(async () => {
    process.env.PUBLIC_BASE_URL = 'https://api.fieri.test';
    save = jest
      .fn<Promise<{ key: string; url: string }>, [Buffer, ArgsSave]>()
      .mockResolvedValue({ key: 'images/x.png', url: 'https://s3/presigne' });
    readByKey = jest
      .fn<Promise<Buffer | null>, [string]>()
      .mockResolvedValue(Buffer.from('des-octets'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: StorageService, useValue: { save, readByKey } },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  describe('saveImage', () => {
    it('range l’image et renvoie une adresse stable, pas l’URL présignée', async () => {
      const res = await service.saveImage(image());

      // C'est tout l'objet de la route de lecture : une URL présignée S3
      // expire en une heure, une photo de profil non.
      expect(res.url).toBe(`https://api.fieri.test/files/images/${res.name}`);
      expect(res.url).not.toContain('presigne');
      expect(save).toHaveBeenCalledWith(expect.any(Buffer), {
        subdir: 'images',
        filename: res.name,
      });
    });

    it('tire un nom au sort : deux « photo.png » ne s’écrasent pas', async () => {
      const a = await service.saveImage(image());
      const b = await service.saveImage(image());
      expect(a.name).not.toBe(b.name);
      expect(a.name).toMatch(/^[0-9a-f-]{36}\.png$/);
    });

    it('donne à chaque type son extension', async () => {
      const jpg = await service.saveImage(image({ mimetype: 'image/jpeg' }));
      const webp = await service.saveImage(image({ mimetype: 'image/webp' }));
      expect(jpg.name.endsWith('.jpg')).toBe(true);
      expect(webp.name.endsWith('.webp')).toBe(true);
    });

    it('refuse un fichier absent ou vide', async () => {
      await expect(service.saveImage(undefined)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.saveImage(image({ size: 0 })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(save).not.toHaveBeenCalled();
    });

    it('refuse ce qui n’est pas une image', async () => {
      await expect(
        service.saveImage(image({ mimetype: 'application/pdf' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(save).not.toHaveBeenCalled();
    });

    it('refuse au-delà de 3 Mo', async () => {
      await expect(
        service.saveImage(image({ size: 3 * 1024 * 1024 + 1 })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('readImage', () => {
    it('relit par clé et annonce le bon type', async () => {
      const nom = '11111111-2222-3333-4444-555555555555.webp';
      const res = await service.readImage(nom);
      expect(readByKey).toHaveBeenCalledWith(`images/${nom}`);
      expect(res?.contentType).toBe('image/webp');
    });

    it('refuse un nom qui n’est pas de nous, sans toucher au stockage', async () => {
      for (const nom of ['../../etc/passwd', 'photo.png', 'x.exe', '']) {
        expect(await service.readImage(nom)).toBeNull();
      }
      expect(readByKey).not.toHaveBeenCalled();
    });

    it('renvoie null quand le fichier a disparu', async () => {
      readByKey.mockResolvedValueOnce(null);
      expect(
        await service.readImage('11111111-2222-3333-4444-555555555555.png'),
      ).toBeNull();
    });
  });
});
