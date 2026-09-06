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
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ProjectService } from './project.service';
import type {
  AuthenticatedRequest,
  OptionalAuthRequest,
} from '../../auth/authenticated-request';
import { ProjectClubMemberGuard, ProjectWriteGuard } from '../../auth/guards';

// `team` reste un tableau libre (structure hétérogène validée dans le service) :
// on garantit seulement que c'est bien un tableau, sans en filtrer le contenu.
class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @IsOptional()
  @IsArray()
  team?: unknown[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  clubId?: string;
}

class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @IsOptional()
  @IsArray()
  team?: unknown[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  clubId?: string;
}

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
    @Query('diriges') diriges?: string,
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
      diriges === 'true',
      req.user?.role,
    );
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectService.getProjectById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'RESPONSABLE_CLUB', 'RESPONSABLE', 'ADMIN')
  @UseGuards(ProjectClubMemberGuard)
  @Post()
  async createProject(
    @Request() req: AuthenticatedRequest,
    @Body() data: CreateProjectDto,
  ) {
    return this.projectService.createProject(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'RESPONSABLE_CLUB', 'RESPONSABLE', 'ADMIN')
  @UseGuards(ProjectWriteGuard)
  @Put(':id')
  async updateProject(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: UpdateProjectDto,
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
  @UseGuards(ProjectWriteGuard)
  @Delete(':id')
  async deleteProject(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.projectService.deleteProject(id);
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
