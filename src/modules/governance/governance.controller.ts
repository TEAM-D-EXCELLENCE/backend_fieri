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
import { GovernanceService } from './governance.service';
import type {
  RequestDeletionDto,
  ConfirmDeletionDto,
} from './governance.service';

@Controller()
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  /** Demande d'exclusion — Responsable de Club (ou ADMIN). */
  @UseGuards(AuthGuard('jwt'))
  @Post('members/:id/request-deletion')
  async requestDeletion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestDeletionDto,
    @Request() req,
  ) {
    return this.governanceService.requestDeletion(id, dto, req.user.id);
  }

  /** Validation/refus de l'exclusion — Chef Universitaire (ou ADMIN). */
  @UseGuards(AuthGuard('jwt'))
  @Post('members/:id/confirm-deletion')
  async confirmDeletion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmDeletionDto,
    @Request() req,
  ) {
    return this.governanceService.confirmDeletion(id, dto, req.user.id);
  }

  /** Demandes d'exclusion en attente d'une université — Chef Universitaire. */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('CHEF_UNIVERSITAIRE')
  @Get('universities/:id/deletion-requests')
  async listDeletionRequests(@Param('id', ParseIntPipe) id: number) {
    return this.governanceService.listDeletionRequests(id);
  }

  /** Activer / Désactiver le statut "Figure emblématique" — Chef Universitaire / ADMIN. */
  @UseGuards(AuthGuard('jwt'))
  @Post('members/:id/toggle-emblematic')
  async toggleEmblematic(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isEmblematic: boolean },
    @Request() req,
  ) {
    return this.governanceService.toggleEmblematic(id, body.isEmblematic, req.user.id);
  }

  /** Liste publique des figures emblématiques de la communauté. */
  @Get('emblematic-figures')
  async getEmblematicFigures() {
    return this.governanceService.listEmblematicMembers();
  }
}
