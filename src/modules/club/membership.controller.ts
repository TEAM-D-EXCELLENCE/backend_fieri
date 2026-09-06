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
import { ClubFrom, ClubManagerGuard } from '../../auth/guards';

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
    @Body('motivation') motivation?: string,
    @Body('contact') contact?: string,
  ) {
    // L'identite vient du jeton : le `user` que le client envoyait etait
    // ignore, et le restera. En revanche la motivation et le moyen de contact
    // sont ecrits par la personne, et le responsable a besoin des deux.
    return this.clubService.createMembershipRequest(clubId, req.user.id, {
      motivation,
      contact,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ClubManagerGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @ClubFrom({ param: 'clubId' })
  @Get('requests/pending/:clubId')
  async getPendingRequests(@Param('clubId') clubId: string) {
    return this.clubService.getPendingRequestsForClub(clubId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ClubManagerGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @ClubFrom({ param: 'clubId' })
  @Get('requests/club/:clubId')
  async getClubHistory(@Param('clubId') clubId: string) {
    return this.clubService.getClubHistory(clubId);
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

  @UseGuards(AuthGuard('jwt'), RolesGuard, ClubManagerGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @ClubFrom({ param: 'requestId', through: 'clubMembership' })
  @Patch('requests/:requestId/approve')
  async approveRequest(@Param('requestId') requestId: string) {
    return this.clubService.approveRequest(requestId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ClubManagerGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @ClubFrom({ param: 'requestId', through: 'clubMembership' })
  @Patch('requests/:requestId/reject')
  async rejectRequest(@Param('requestId') requestId: string) {
    return this.clubService.rejectRequest(requestId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ClubManagerGuard)
  @Roles('RESPONSABLE', 'ADMIN')
  @ClubFrom({ param: 'clubId' })
  @Delete(':clubId/user/:userId')
  async removeMembership(
    @Param('clubId') clubId: string,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.clubService.removeUserMembership(clubId, userId);
  }
}
