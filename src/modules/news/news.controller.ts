import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getNews(
    @Request() req,
    @Query('includePending') includePending?: string,
  ) {
    const memberId = req.user ? req.user.id : undefined;
    const isIncludePending = includePending === 'true';
    return this.newsService.getNews(isIncludePending, memberId);
  }

  @Get(':id')
  async getNewsById(@Param('id') id: string) {
    return this.newsService.getNewsById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createNews(
    @Request() req,
    @Body() data: { title: string; content: string; category: string },
  ) {
    return this.newsService.createNews(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/approve')
  async approveNews(@Param('id') id: string) {
    return this.newsService.approveNews(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deleteNews(@Param('id') id: string, @Request() req) {
    return this.newsService.deleteNews(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async updateNews(
    @Param('id') id: string,
    @Request() req,
    @Body() data: Partial<{ title: string; content: string; category: string }>,
  ) {
    return this.newsService.updateNews(id, req.user.id, req.user.role, data);
  }
}
