import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UniversityPostGuard } from '../../auth/university-post.guard';
import { UniversityPosts } from '../../auth/university-post.decorator';
import { HackathonService } from './hackathon.service';
import type { CreateHackathonDto } from './hackathon.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Controller()
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  /** Création d'un hackathon affecté à un club — Chef Universitaire. */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('CHEF_UNIVERSITAIRE')
  @Post('universities/:id/hackathons')
  async create(
    @Param('id', ParseIntPipe) universityId: number,
    @Body() dto: CreateHackathonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.hackathonService.createHackathon(
      universityId,
      dto,
      req.user.id,
    );
  }

  /** Hackathons d'une université. */
  @Get('universities/:id/hackathons')
  async listByUniversity(@Param('id', ParseIntPipe) universityId: number) {
    return this.hackathonService.listByUniversity(universityId);
  }

  /** Hackathons d'un club. */
  @Get('clubs/:id/hackathons')
  async listByClub(@Param('id') clubId: string) {
    return this.hackathonService.listByClub(clubId);
  }
}
