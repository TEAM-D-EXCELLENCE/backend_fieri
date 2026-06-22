import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkshopService } from './workshop.service';

@Controller('workshops')
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Get()
  async getWorkshops() {
    return this.workshopService.getWorkshops();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/register')
  async register(
    @Param('id') id: string,
    @Request() req,
    @Body('userFullName') userFullName: string,
  ) {
    return this.workshopService.registerToWorkshop(id, req.user.id, userFullName);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/register')
  async deregister(@Param('id') id: string, @Request() req) {
    return this.workshopService.deregisterFromWorkshop(id, req.user.id);
  }
}
