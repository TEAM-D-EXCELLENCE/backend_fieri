import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubService } from './club.service';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('memberships')
export class MembershipController {
  constructor(private readonly clubService: ClubService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('requests')
  async createRequest(
    @Request() req,
    @Body('clubId') clubId: string,
  ) {
    // Note: the spec body contains { clubId, user: { id } } but we can safely use the authenticated user's ID
    return this.clubService.createMembershipRequest(clubId, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @Get('requests/pending/:clubId')
  async getPendingRequests(@Param('clubId') clubId: string) {
    return this.clubService.getPendingRequestsForClub(clubId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('requests/club/:clubId')
  async getClubHistory(@Param('clubId') clubId: string) {
    return this.clubService.getClubHistory(clubId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('requests/user/:userId')
  async getUserRequests(@Param('userId', ParseIntPipe) userId: number) {
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

  @UseGuards(AuthGuard('jwt'))
  @Delete(':clubId/user/:userId')
  async removeMembership(
    @Param('clubId') clubId: string,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.clubService.removeUserMembership(clubId, userId);
  }
}
