import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { ContributionService } from './contribution.service';
import type {
  AuthenticatedRequest,
  OptionalAuthRequest,
} from '../../auth/authenticated-request';

@Controller('contributions')
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('donate')
  async donate(
    @Body() data: { amount: number; email: string; message?: string },
    @Request() req: OptionalAuthRequest,
  ) {
    const memberId = req.user?.id || null;
    return this.contributionService.createDonation(data, memberId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('partner')
  async partner(
    @Body() data: { organisation: string; email: string; message?: string },
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
