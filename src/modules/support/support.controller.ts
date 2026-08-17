import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  Headers,
  HttpCode,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { SupportService } from './support.service';
import type {
  InitiateFinancialDto,
  SubmitPhysicalDto,
} from './support.service';

/** Extrait l'IP publique approximative de l'appelant. */
function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

// En-tête portant la signature HMAC du webhook (surchargable via l'env).
const SIGNATURE_HEADER =
  process.env.GENIUS_PAY_SIGNATURE_HEADER ?? 'x-geniuspay-signature';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Initie un don financier et renvoie l'URL de paiement hébergée.
   * Public : le donateur peut être anonyme ou connecté (JWT optionnel).
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('initiate-financial')
  async initiateFinancial(
    @Body() dto: InitiateFinancialDto,
    @Req() req: Request & { user?: { id: number } },
  ) {
    const memberId = req.user?.id ?? null;
    return this.supportService.initiateFinancial(dto, memberId);
  }

  /**
   * Réception de la notification de règlement du processeur de paiement.
   * La signature est validée à partir du corps BRUT de la requête.
   */
  @Post('payment-webhook')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  async paymentWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers(SIGNATURE_HEADER) signature: string,
  ) {
    return this.supportService.handlePaymentWebhook(req.rawBody, signature);
  }

  /** Confirmation d'un don via le mock Genius Pay (démo jury uniquement). */
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/confirm-mock-payment')
  async confirmMockPayment(@Param('id') id: string) {
    if (process.env.GENIUS_PAY_MOCK !== 'true') {
      throw new NotFoundException('Mode simulation désactivé.');
    }
    return this.supportService.confirmMockPayment(id);
  }

  /** Déclaration d'un soutien physique / matériel. JWT optionnel. */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('submit-physical')
  async submitPhysical(
    @Body() dto: SubmitPhysicalDto,
    @Req() req: Request & { user?: { id: number } },
  ) {
    const memberId = req.user?.id ?? null;
    return this.supportService.submitPhysical(dto, memberId);
  }

  /**
   * Signature d'une offre physique par « scan d'empreinte » : capture l'IP et
   * le User-Agent du partenaire pour dériver le hash de consentement.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/sign-biometric')
  async signBiometric(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: number } },
  ) {
    return this.supportService.signBiometric(id, {
      ip: extractIp(req),
      userAgent: req.headers['user-agent'] ?? 'unknown',
      memberId: req.user?.id ?? null,
    });
  }
}
