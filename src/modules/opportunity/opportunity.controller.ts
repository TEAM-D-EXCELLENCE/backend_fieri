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
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { OpportunityService } from './opportunity.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { ResourceOwner, ResourceOwnerGuard } from '../../auth/guards';

class CreateOpportunityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description!: string;

  @IsString()
  @MaxLength(60)
  type!: string;

  @IsString()
  @MaxLength(120)
  discipline!: string;

  @IsOptional()
  @IsNumber()
  salary?: number;
}

class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  discipline?: string;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}

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
    @Body() data: CreateOpportunityDto,
  ) {
    return this.opportunityService.createOpportunity(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ResourceOwnerGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @ResourceOwner({ resource: 'opportunity' })
  @Put(':id')
  async updateOpportunity(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: UpdateOpportunityDto,
  ) {
    return this.opportunityService.updateOpportunity(
      id,
      req.user.id,
      req.user.role,
      data,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ResourceOwnerGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @ResourceOwner({ resource: 'opportunity' })
  @Delete(':id')
  async deleteOpportunity(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.opportunityService.deleteOpportunity(id);
  }
}
