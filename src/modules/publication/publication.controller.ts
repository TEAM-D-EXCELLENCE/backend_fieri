import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { PublicationService } from './publication.service';

@Controller('publications')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get()
  async getPublications(
    @Query('authorId') authorId?: string,
    @Query('clubId') clubId?: string,
    @Query('projectId') projectId?: string,
    @Query('newsId') newsId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return this.publicationService.getPublications({
      authorId: authorId ? parseInt(authorId, 10) : undefined,
      clubId,
      projectId,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id')
  async getPublication(@Param('id') id: string) {
    return this.publicationService.getPublicationById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @Post()
  async createPublication(
    @Request() req,
    @Body() data: { title: string; content: string; category: string; projectId?: string; clubId?: string },
  ) {
    return this.publicationService.createPublication(req.user.id, data);
  }
}
