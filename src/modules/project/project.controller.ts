import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getProjects(
    @Request() req,
    @Query('clubId') clubId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const memberId = req.user ? req.user.id : undefined;
    return this.projectService.getProjects(memberId, clubId, status, search);
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectService.getProjectById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/follow')
  async followProject(@Param('id') id: string, @Request() req) {
    return this.projectService.toggleFollowProject(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/support')
  async supportProject(
    @Param('id') id: string,
    @Request() req,
    @Body('amount') amount: number,
    @Body('message') message?: string,
  ) {
    return this.projectService.supportProject(id, req.user.id, amount, message);
  }
}
