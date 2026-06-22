import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResearcherService } from './researcher.service';

@Controller('researchers')
export class ResearcherController {
  constructor(private readonly researcherService: ResearcherService) {}

  @Get()
  async getResearchers() {
    return this.researcherService.getResearchers();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyProfile(@Request() req) {
    return this.researcherService.getMyResearcherProfile(req.user.id);
  }

  @Get(':id')
  async getResearcher(@Param('id', ParseIntPipe) id: number) {
    return this.researcherService.getResearcherById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  async updateMyProfile(
    @Request() req,
    @Body() data: { bio?: string; skills?: string[]; avatarUrl?: string },
  ) {
    return this.researcherService.updateMyResearcherProfile(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/follow')
  async followResearcher(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.researcherService.toggleFollowResearcher(req.user.id, id);
  }
}
