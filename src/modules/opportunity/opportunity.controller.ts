import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { OpportunityService } from './opportunity.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Controller('opportunities')
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Get()
  async getOpportunities(
    @Query('type') type?: string,
    @Query('discipline') discipline?: string,
    @Query('status') status?: string,
  ) {
    return this.opportunityService.getOpportunities({
      type,
      discipline,
      status,
    });
  }

  @Get(':id')
  async getOpportunityById(@Param('id') id: string) {
    return this.opportunityService.getOpportunityById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @Post()
  async createOpportunity(
    @Request() req: AuthenticatedRequest,
    @Body()
    data: {
      title: string;
      description: string;
      type: string;
      discipline: string;
      salary?: number;
    },
  ) {
    return this.opportunityService.createOpportunity(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @Put(':id')
  async updateOpportunity(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    data: Partial<{
      title: string;
      description: string;
      type: string;
      discipline: string;
      salary: number;
      status: string;
    }>,
  ) {
    return this.opportunityService.updateOpportunity(
      id,
      req.user.id,
      req.user.role,
      data,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @Delete(':id')
  async deleteOpportunity(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.opportunityService.deleteOpportunity(
      id,
      req.user.id,
      req.user.role,
    );
  }
}
