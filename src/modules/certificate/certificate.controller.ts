import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UniversityPostGuard } from '../../auth/university-post.guard';
import { UniversityPosts } from '../../auth/university-post.decorator';
import { CertificateService } from './certificate.service';
import { IssueCertificateDto } from './certificate.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { UniversityChiefGuard } from '../../auth/guards';

@Controller()
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  /** Téléversement de la signature manuscrite (PNG) — Chef Universitaire. */
  @UseGuards(AuthGuard('jwt'), UniversityChiefGuard)
  @Post('members/upload-signature')
  @UseInterceptors(FileInterceptor('signature'))
  async uploadSignature(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.certificateService.uploadSignature(req.user.id, file);
  }

  /** Émission d'une attestation — Chef Universitaire de l'université ciblée. */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('CHEF_UNIVERSITAIRE')
  @Post('universities/:id/certificates')
  async issue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IssueCertificateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.certificateService.issueCertificate(id, dto, req.user.id);
  }

  /** Attestations reçues par un membre. */
  @Get('members/:id/certificates')
  async list(@Param('id', ParseIntPipe) id: number) {
    return this.certificateService.listForMember(id);
  }
}
