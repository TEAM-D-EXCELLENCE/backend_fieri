import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ApplicationService } from './application.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

class SubmitApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  opportunityId!: string;

  // Lettre et CV peuvent être vides (candidature express) : optionnels et bornés.
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  coverLetter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cvUrl?: string;
}

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async submitApplication(
    @Request() req: AuthenticatedRequest,
    @Body() data: SubmitApplicationDto,
  ) {
    return this.applicationService.submitApplication(req.user.id, {
      opportunityId: data.opportunityId,
      coverLetter: data.coverLetter ?? '',
      cvUrl: data.cvUrl ?? '',
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyApplications(@Request() req: AuthenticatedRequest) {
    return this.applicationService.getMyApplications(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('check/:opportunityId')
  async checkIfApplied(
    @Param('opportunityId') opportunityId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.applicationService.checkIfApplied(req.user.id, opportunityId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @Get('opportunity/:opportunityId')
  async getOpportunityApplications(
    @Param('opportunityId') opportunityId: string,
  ) {
    return this.applicationService.getOpportunityApplications(opportunityId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.applicationService.updateApplicationStatus(id, status);
  }
}
