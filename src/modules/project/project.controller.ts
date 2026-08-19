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
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ProjectService } from './project.service';
import type {
  AuthenticatedRequest,
  OptionalAuthRequest,
} from '../../auth/authenticated-request';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getProjects(
    @Request() req: OptionalAuthRequest,
    @Query('clubId') clubId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const memberId = req.user ? req.user.id : undefined;
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.projectService.getProjects(
      memberId,
      clubId,
      status,
      search,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectService.getProjectById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'RESPONSABLE_CLUB', 'RESPONSABLE', 'ADMIN')
  @Post()
  async createProject(
    @Request() req: AuthenticatedRequest,
    @Body()
    data: {
      title: string;
      summary: string;
      description?: string;
      status?: string;
      technologies?: string[];
      team?: any[];
      clubId?: string;
    },
  ) {
    return this.projectService.createProject(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'RESPONSABLE_CLUB', 'RESPONSABLE', 'ADMIN')
  @Put(':id')
  async updateProject(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    data: Partial<{
      title: string;
      summary: string;
      description: string;
      status: string;
      technologies: string[];
      team: any[];
      clubId: string;
    }>,
  ) {
    return this.projectService.updateProject(
      id,
      req.user.id,
      req.user.role,
      data,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'RESPONSABLE_CLUB', 'RESPONSABLE', 'ADMIN')
  @Delete(':id')
  async deleteProject(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.projectService.deleteProject(id, req.user.id, req.user.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/follow')
  async followProject(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectService.followProject(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/follow')
  async unfollowProject(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectService.unfollowProject(id, req.user.id);
  }

  // Conserve la bascule pour les clients qui l'utilisent (bouton étoile).
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/toggle-follow')
  async toggleFollowProject(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.projectService.toggleFollowProject(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/support')
  async supportProject(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('amount') amount: number,
    @Body('message') message?: string,
  ) {
    return this.projectService.supportProject(id, req.user.id, amount, message);
  }
}
