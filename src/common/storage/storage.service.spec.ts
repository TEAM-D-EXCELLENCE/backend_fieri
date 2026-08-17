import { StorageService } from './storage.service';
import { promises as fs } from 'fs';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { join } from 'path';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<
  typeof getSignedUrl
>;

describe('StorageService (mode FS local)', () => {
  let service: StorageService;
  const tmpDir = join(process.cwd(), 'tmp-storage-test');

  beforeAll(() => {
    delete process.env.S3_BUCKET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FILE_STORAGE_DIR = tmpDir;
    service = new StorageService();
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should save a buffer with sanitized paths and return a /uploads URL', async () => {
    const result = await service.save(Buffer.from('pdf-data'), {
      subdir: '../support-agreements',
      filename: 'entente-1.pdf',
    });

    expect(result.key).toBe('support-agreements/entente-1.pdf');
    expect(result.url).toContain('/uploads/support-agreements/entente-1.pdf');
    const content = await fs.readFile(
      join(tmpDir, 'support-agreements', 'entente-1.pdf'),
    );
    expect(content.toString()).toBe('pdf-data');
  });

  it('should sanitize dangerous characters in subdir and filename', async () => {
    const result = await service.save(Buffer.from('x'), {
      subdir: '../certificates',
      filename: 'attest;ion1.pdf',
    });

    expect(result.key).toBe('certificates/attestion1.pdf');
  });

  it('should read back a stored file via its public URL', async () => {
    const { url } = await service.save(Buffer.from('contenu-test'), {
      subdir: 'certificates',
      filename: 'attestation-1.pdf',
    });

    const buffer = await service.readByUrl(url);
    expect(buffer).not.toBeNull();
    expect(buffer!.toString()).toBe('contenu-test');
  });

  it('should return null for a URL outside /uploads (path traversal)', async () => {
    const buffer = await service.readByUrl(
      'http://localhost:3000/../etc/passwd',
    );
    expect(buffer).toBeNull();
  });
});

describe('StorageService (mode S3-compatible)', () => {
  let service: StorageService;
  const fakeUrl =
    'https://minio.local/fieri-bucket/support-agreements/entente-1.pdf?X-Amz-Signature=abc';

  beforeAll(() => {
    process.env.S3_BUCKET = 'fieri-bucket';
    process.env.S3_ENDPOINT = 'https://minio.local';
    process.env.S3_REGION = 'auto';
    process.env.S3_ACCESS_KEY_ID = 'key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService();
  });

  afterAll(() => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_REGION;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  it('should upload via PutObjectCommand and return a presigned URL', async () => {
    mockGetSignedUrl.mockResolvedValueOnce(fakeUrl);

    const result = await service.save(Buffer.from('pdf-s3'), {
      subdir: 'support-agreements',
      filename: 'entente-1.pdf',
    });

    expect(result.key).toBe('support-agreements/entente-1.pdf');
    expect(result.url).toBe(fakeUrl);
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'fieri-bucket',
        Key: 'support-agreements/entente-1.pdf',
      }),
    );
    expect(mockSend).toHaveBeenCalled();
  });

  it('should read an object via GetObjectCommand from a presigned URL', async () => {
    mockSend.mockResolvedValueOnce({
      Body: {
        transformToByteArray: jest
          .fn()
          .mockResolvedValue(new Uint8Array([112, 100, 102])),
      },
    });

    const buffer = await service.readByUrl(fakeUrl);

    expect(buffer).not.toBeNull();
    expect(buffer!.toString()).toBe('pdf');
    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'fieri-bucket',
        Key: 'support-agreements/entente-1.pdf',
      }),
    );
  });

  it('should return null when the object key cannot be extracted (foreign bucket)', async () => {
    const buffer = await service.readByUrl(
      'https://minio.local/autre-bucket/secret.pdf?X-Amz-Signature=abc',
    );
    expect(buffer).toBeNull();
  });
});
