import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { NewsletterService } from './newsletter.service';
import type { SubscribeDto } from './newsletter.service';
import type { OptionalAuthRequest } from '../../auth/authenticated-request';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  /**
   * Abonnement — ouvert à tous. L'authentification est OPTIONNELLE : elle
   * rattache l'abonnement au compte quand il y en a un, sans jamais l'exiger.
   *
   * Écriture publique, donc limitée : 5 demandes par minute et par IP. Sans
   * cela, la table s'ouvre au remplissage automatique.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('subscribe')
  async subscribe(
    @Body() dto: SubscribeDto,
    @Request() req: OptionalAuthRequest,
  ) {
    return this.newsletterService.subscribe(dto, req.user?.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('unsubscribe')
  async unsubscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.unsubscribe(dto);
  }

  /** La liste des abonnés — ADMIN. C'est la réponse à « où atterrissent-elles ». */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('subscribers')
  async list() {
    return this.newsletterService.list();
  }
}
