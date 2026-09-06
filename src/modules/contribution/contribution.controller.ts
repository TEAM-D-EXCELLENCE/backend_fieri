import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { ContributionService } from './contribution.service';
import type {
  AuthenticatedRequest,
  OptionalAuthRequest,
} from '../../auth/authenticated-request';

// Endpoints publics (JWT optionnel) : bornés contre le spam et les montants
// aberrants.
class DonateDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

class PartnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  organisation!: string;

  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

@Controller('contributions')
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('donate')
  async donate(
    @Body() data: DonateDto,
    @Request() req: OptionalAuthRequest,
  ) {
    const memberId = req.user?.id || null;
    return this.contributionService.createDonation(data, memberId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('partner')
  async partner(
    @Body() data: PartnerDto,
    @Request() req: OptionalAuthRequest,
  ) {
    const memberId = req.user?.id || null;
    return this.contributionService.createPartnership(data, memberId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyContributions(@Request() req: AuthenticatedRequest) {
    return this.contributionService.getMyContributions(req.user.id);
  }
}
