import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { WorkshopService } from './workshop.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Controller('formations')
export class FormationsController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Get()
  async getFormations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.workshopService.getWorkshops(pageNum, limitNum);
  }

  @Get(':id')
  async getFormation(@Param('id') id: string) {
    return this.workshopService.getWorkshopById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @Post()
  async createFormation(
    @Body() data: { title: string; instructor: string; capacity: number },
  ) {
    return this.workshopService.createWorkshop(data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'CHERCHEUR')
  @Put(':id')
  async updateFormation(
    @Param('id') id: string,
    @Body()
    data: Partial<{ title: string; instructor: string; capacity: number }>,
  ) {
    return this.workshopService.updateWorkshop(id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/register')
  async register(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('userFullName') userFullName: string,
  ) {
    const fullName =
      userFullName || `${req.user.firstname} ${req.user.lastname}`;
    return this.workshopService.registerToWorkshop(id, req.user.id, fullName);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/waitlist')
  async registerWaitlist(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('userFullName') userFullName: string,
  ) {
    const fullName =
      userFullName || `${req.user.firstname} ${req.user.lastname}`;
    return this.workshopService.registerToWorkshopWaitlist(
      id,
      req.user.id,
      fullName,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/register')
  async deregister(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workshopService.deregisterFromWorkshop(id, req.user.id);
  }
}
