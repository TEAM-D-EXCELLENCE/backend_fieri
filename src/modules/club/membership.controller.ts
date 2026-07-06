import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubService } from './club.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('memberships')
export class MembershipController {
  constructor(
    private readonly clubService: ClubService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('requests')
  async createRequest(@Request() req, @Body('clubId') clubId: string) {
    // Note: the spec body contains { clubId, user: { id } } but we can safely use the authenticated user's ID
    return this.clubService.createMembershipRequest(clubId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Get('requests/pending/:clubId')
  async getPendingRequests(@Param('clubId') clubId: string) {
    return this.clubService.getPendingRequestsForClub(clubId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Get('requests/club/:clubId')
  async getClubHistory(@Param('clubId') clubId: string) {
    return this.clubService.getClubHistory(clubId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('requests/user/:userId')
  async getUserRequests(@Request() req, @Param('userId', ParseIntPipe) userId: number) {
    if (req.user.id !== userId) {
      const member = await this.prisma.member.findUnique({ where: { id: req.user.id } });
      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException("Vous ne pouvez consulter que vos propres demandes.");
      }
    }
    return this.clubService.getUserRequests(userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Patch('requests/:requestId/approve')
  async approveRequest(@Param('requestId') requestId: string) {
    return this.clubService.approveRequest(requestId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Patch('requests/:requestId/reject')
  async rejectRequest(@Param('requestId') requestId: string) {
    return this.clubService.rejectRequest(requestId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Delete(':clubId/user/:userId')
  async removeMembership(
    @Param('clubId') clubId: string,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.clubService.removeUserMembership(clubId, userId);
  }
}
