import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MembersService } from './members.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

/** Parse un entier de query-string en le bornant, avec repli sûr si absent/invalide. */
function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(Math.max(n, min), max);
}

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const member = await this.membersService.getMemberById(req.user.id);
    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }
    return {
      success: true,
      message: 'Profil récupéré',
      data: member,
    };
  }

  /**
   * Annuaire des membres.
   *
   * Cette route n'avait AUCUNE garde : elle distribuait l'adresse e-mail de
   * tous les membres a qui la demandait, sans authentification. L'inventaire
   * la documentait pourtant en ADMIN.
   *
   * Elle exige desormais un compte, et l'adresse e-mail n'est jointe qu'a qui
   * exerce une responsabilite — c'est la capacite `directory:viewContacts` du
   * front, portee ici par le serveur. La fermer completement aurait casse deux
   * ecrans legitimes : l'affectation des taches d'un projet a besoin des NOMS
   * des membres, pas de leurs coordonnees, tandis que l'annuaire de
   * l'universite et les figures emblematiques ont besoin des deux.
   *
   * Le public, lui, passe par `GET /governance/leaders`.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getMembers(
    @Request() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Bornes sûres : un `page`/`limit` non numérique tombait en erreur 500, et
    // un `limit` géant permettait de vider la table en une requête.
    const pageNum = clampInt(page, 1, 1, Number.MAX_SAFE_INTEGER);
    const limitNum = clampInt(limit, 20, 1, 100);
    return this.membersService.getMembers({
      search,
      role,
      page: pageNum,
      limit: limitNum,
      viewerId: req.user.id,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  async getMember(@Param('id', ParseIntPipe) id: number) {
    const member = await this.membersService.getMemberById(id);
    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }
    return {
      success: true,
      data: member,
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.membersService.updateMemberRole(id, body.role, req.user.id);
  }

  /**
   * Attribue le poste d'université d'un membre — le second axe du modèle
   * d'accès. `post: null` retire le poste.
   *
   * Ces postes commandent l'essentiel de la navigation de l'espace connecté
   * (trésorerie, attestations, rapports), et aucune interface ne permettait de
   * les attribuer : seul le rôle linéaire l'était.
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Put(':id/university-post')
  async setUniversityPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { post: string | null; universityId: number },
  ) {
    return this.membersService.setUniversityPost(
      id,
      body.post ?? null,
      body.universityId,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Put(':id/country-post')
  async setCountryPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { post: string | null; countryId: number },
  ) {
    return this.membersService.setCountryPost(
      id,
      body.post ?? null,
      body.countryId,
    );
  }
}
