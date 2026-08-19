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
import { ClubService } from './club.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { ClubFrom, ClubManagerGuard } from '../../auth/guards';

@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  async getClubs(
    @Query('featured') featured?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return this.clubService.getClubs(pageNum, limitNum);
  }

  @Get(':id')
  async getClub(@Param('id') id: string) {
    return this.clubService.getClubById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createClub(
    @Body()
    data: {
      name: string;
      discipline: string;
      description?: string;
    },
  ) {
    return this.clubService.createClub(data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ClubManagerGuard)
  @Roles('ADMIN', 'RESPONSABLE')
  @ClubFrom({ param: 'id' })
  @Put(':id')
  async updateClub(
    @Param('id') id: string,
    @Body()
    data: Partial<{ name: string; discipline: string; description: string }>,
  ) {
    return this.clubService.updateClub(id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async deleteClub(@Param('id') id: string) {
    return this.clubService.deleteClub(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  async joinClub(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.joinClubDirect(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/join')
  async leaveClub(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.leaveClubDirect(id, req.user.id);
  }
}
