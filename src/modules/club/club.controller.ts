import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubService } from './club.service';

@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  async getClubs() {
    return this.clubService.getClubs();
  }

  @Get(':id')
  async getClub(@Param('id') id: string) {
    return this.clubService.getClubById(id);
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
