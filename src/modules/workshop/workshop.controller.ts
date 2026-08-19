import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkshopService } from './workshop.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Controller('workshops')
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Get()
  async getWorkshops(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.workshopService.getWorkshops(pageNum, limitNum);
  }

  @Get(':id')
  async getWorkshop(@Param('id') id: string) {
    return this.workshopService.getWorkshopById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/register')
  async register(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('userFullName') userFullName: string,
  ) {
    return this.workshopService.registerToWorkshop(
      id,
      req.user.id,
      userFullName,
    );
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
