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
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Controller('memberships')
export class MembershipController {
  constructor(
    private readonly clubService: ClubService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('requests')
  async createRequest(
    @Request() req: AuthenticatedRequest,
    @Body('clubId') clubId: string,
  ) {
    // Note: the spec body contains { clubId, user: { id } } but we can safely use the authenticated user's ID
    return this.clubService.createMembershipRequest(clubId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Get('requests/pending/:clubId')
  async getPendingRequests(
    @Param('clubId') clubId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.getPendingRequestsForClub(clubId, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Get('requests/club/:clubId')
  async getClubHistory(
    @Param('clubId') clubId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.getClubHistory(clubId, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('requests/user/:userId')
  async getUserRequests(
    @Request() req: AuthenticatedRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    if (req.user.id !== userId) {
      const member = await this.prisma.member.findUnique({
        where: { id: req.user.id },
      });
      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException(
          'Vous ne pouvez consulter que vos propres demandes.',
        );
      }
    }
    return this.clubService.getUserRequests(userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Patch('requests/:requestId/approve')
  async approveRequest(
    @Param('requestId') requestId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.approveRequest(requestId, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Patch('requests/:requestId/reject')
  async rejectRequest(
    @Param('requestId') requestId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.rejectRequest(requestId, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Delete(':clubId/user/:userId')
  async removeMembership(
    @Param('clubId') clubId: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.removeUserMembership(clubId, userId, req.user);
  }
}
