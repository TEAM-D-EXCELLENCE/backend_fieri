import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UniversityPostGuard } from '../../auth/university-post.guard';
import { UniversityPosts } from '../../auth/university-post.decorator';
import {
  AssignedActivityGuard,
  ClubFrom,
  ClubManagerGuard,
} from '../../auth/guards';
import { ClubSpaceService } from './club-space.service';
import type { CreateActivityDto, SubmitReportDto } from './club-space.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Controller()
export class ClubSpaceController {
  constructor(private readonly clubSpaceService: ClubSpaceService) {}

  /** Liste des membres actifs d'un club (Responsable / Secrétaire / ADMIN). */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id', posts: ['SECRETAIRE'] })
  @Get('clubs/:id/members-list')
  async membersList(@Param('id') id: string) {
    return this.clubSpaceService.getMembersList(id);
  }

  /** Soumission mensuelle des effectifs à la Secrétaire (Responsable / ADMIN). */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id' })
  @Post('clubs/:id/submit-census')
  async submitCensus(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubSpaceService.submitCensus(id, req.user.id);
  }

  /** Création d'une activité assignée (Responsable / ADMIN). */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id' })
  @Post('clubs/:id/assigned-activities')
  async createActivity(
    @Param('id') id: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.clubSpaceService.createAssignedActivity(id, dto);
  }

  /** Mise à jour du statut d'une activité (assigné / responsable / ADMIN). */
  @UseGuards(AuthGuard('jwt'), AssignedActivityGuard)
  @Patch('assigned-activities/:id')
  async updateActivity(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.clubSpaceService.updateActivityStatus(id, body.status);
  }

  /** Tableau de bord du membre : activités assignées + projets actifs. */
  @UseGuards(AuthGuard('jwt'))
  @Get('members/me/assigned-activities')
  async myDashboard(@Request() req: AuthenticatedRequest) {
    return this.clubSpaceService.getMyDashboard(req.user.id);
  }

  /**
   * Historique des recensements d'une université.
   * Lecture : Secrétaire (qui consolide), Chef Universitaire (qui supervise)
   * et ADMIN — même partage que le grand livre de trésorerie.
   */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('SECRETAIRE', 'CHEF_UNIVERSITAIRE')
  @Get('universities/:id/census-history')
  async censusHistory(@Param('id', ParseIntPipe) id: number) {
    return this.clubSpaceService.getCensusHistory(id);
  }

  /** Validation d'un recensement (Secrétaire / ADMIN). */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('SECRETAIRE')
  @Post('universities/:id/validate-census/:censusId')
  async validateCensus(
    @Param('id', ParseIntPipe) id: number,
    @Param('censusId') censusId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubSpaceService.validateCensus(id, censusId, req.user.id);
  }

  /** Soumission du rapport mensuel d'activité (Responsable / ADMIN). */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id' })
  @Post('clubs/:id/activity-reports')
  async submitReport(
    @Param('id') id: string,
    @Body() dto: SubmitReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubSpaceService.submitActivityReport(id, dto, req.user.id);
  }

  /** Rapports d'activité d'un club (Responsable / Secrétaire / ADMIN). */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id', posts: ['SECRETAIRE'] })
  @Get('clubs/:id/activity-reports')
  async clubReports(@Param('id') id: string) {
    return this.clubSpaceService.listClubReports(id);
  }

  /**
   * Tous les rapports d'activité d'une université.
   * Lecture : Secrétaire (destinataire des dépôts), Chef Universitaire (à qui
   * la Secrétaire les transmet) et ADMIN. La soumission reste au Responsable
   * de Club, et la validation d'un recensement à la Secrétaire seule.
   */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('SECRETAIRE', 'CHEF_UNIVERSITAIRE')
  @Get('universities/:id/activity-reports')
  async universityReports(@Param('id', ParseIntPipe) id: number) {
    return this.clubSpaceService.listUniversityReports(id);
  }
}
