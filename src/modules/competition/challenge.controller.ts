import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChallengeService } from './challenge.service';
import type {
  CreateChallengeDto,
  SubmitDto,
  EvaluateDto,
  CloseChallengeDto,
} from './challenge.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { ClubFrom, ClubManagerGuard } from '../../auth/guards';

@Controller()
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  /** Création d'un challenge — Responsable de Club. */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id' })
  @Post('clubs/:id/challenges')
  async create(
    @Param('id') clubId: string,
    @Body() dto: CreateChallengeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.challengeService.createChallenge(clubId, dto, req.user.id);
  }

  /** Liste des challenges d'un club. */
  @Get('clubs/:id/challenges')
  async listByClub(@Param('id') clubId: string) {
    return this.challengeService.listByClub(clubId);
  }

  /** Détail d'un challenge et de ses soumissions. */
  @Get('challenges/:id')
  async getOne(@Param('id') id: string) {
    return this.challengeService.getById(id);
  }

  /** Soumission d'une solution — membre connecté. */
  @UseGuards(AuthGuard('jwt'))
  @Post('challenges/:id/submit')
  async submit(
    @Param('id') id: string,
    @Body() dto: SubmitDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.challengeService.submit(id, dto, req.user.id);
  }

  /** Évaluation d'une soumission — Responsable de Club (jury). */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id', through: 'challenge' })
  @Post('challenges/:id/submissions/:submissionId/evaluate')
  async evaluate(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: EvaluateDto,
  ) {
    return this.challengeService.evaluate(id, submissionId, dto);
  }

  /** Clôture du challenge et attribution des badges — Responsable de Club. */
  @UseGuards(AuthGuard('jwt'), ClubManagerGuard)
  @ClubFrom({ param: 'id', through: 'challenge' })
  @Post('challenges/:id/close')
  async close(@Param('id') id: string, @Body() dto: CloseChallengeDto) {
    return this.challengeService.close(id, dto);
  }
}
