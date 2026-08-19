import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResearcherService } from './researcher.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Controller('researchers')
export class ResearcherController {
  constructor(private readonly researcherService: ResearcherService) {}

  @Get()
  async getResearchers() {
    return this.researcherService.getResearchers();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.researcherService.getMyResearcherProfile(req.user.id);
  }

  @Get(':id')
  async getResearcher(@Param('id', ParseIntPipe) id: number) {
    return this.researcherService.getResearcherById(id);
  }

  @Get(':id/distinctions')
  async getResearcherDistinctions(@Param('id', ParseIntPipe) id: number) {
    return this.researcherService.getResearcherDistinctions(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('me')
  async updateMyProfile(
    @Request() req: AuthenticatedRequest,
    @Body() data: { bio?: string; skills?: string[]; avatarUrl?: string },
  ) {
    return this.researcherService.updateMyResearcherProfile(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/follow')
  async followResearcher(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.researcherService.toggleFollowResearcher(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/follow')
  async unfollowResearcher(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.researcherService.unfollowResearcher(req.user.id, id);
  }
}
