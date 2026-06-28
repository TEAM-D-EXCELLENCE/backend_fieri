import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ClubService } from './club.service';

@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) { }

  @Get()
  async getClubs() {
    return this.clubService.getClubs();
  }

  @Get(':id')
  async getClub(@Param('id') id: string) {
    return this.clubService.getClubById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createClub(
    @Body() data: { id: string; name: string; discipline: string; description?: string },
  ) {
    return this.clubService.createClub(data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'RESPONSABLE')
  @Put(':id')
  async updateClub(
    @Param('id') id: string,
    @Body() data: Partial<{ name: string; discipline: string; description: string }>,
  ) {
    return this.clubService.updateClub(id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  async joinClub(@Param('id') id: string, @Request() req) {
    return this.clubService.joinClubDirect(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/join')
  async leaveClub(@Param('id') id: string, @Request() req) {
    return this.clubService.leaveClubDirect(id, req.user.id);
  }
}
