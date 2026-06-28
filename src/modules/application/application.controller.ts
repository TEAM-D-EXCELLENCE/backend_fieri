import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ApplicationService } from './application.service';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async submitApplication(
    @Request() req,
    @Body() data: { opportunityId: string; coverLetter: string; cvUrl: string },
  ) {
    return this.applicationService.submitApplication(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyApplications(@Request() req) {
    return this.applicationService.getMyApplications(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('check/:opportunityId')
  async checkIfApplied(@Param('opportunityId') opportunityId: string, @Request() req) {
    return this.applicationService.checkIfApplied(req.user.id, opportunityId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @Get('opportunity/:opportunityId')
  async getOpportunityApplications(@Param('opportunityId') opportunityId: string) {
    return this.applicationService.getOpportunityApplications(opportunityId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.applicationService.updateApplicationStatus(id, status);
  }
}
