import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { NewsService } from './news.service';
import type {
  AuthenticatedRequest,
  OptionalAuthRequest,
} from '../../auth/authenticated-request';
import { ResourceOwner, ResourceOwnerGuard } from '../../auth/guards';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getNews(
    @Request() req: OptionalAuthRequest,
    @Query('includePending') includePending?: string,
    @Query('featured') featured?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const memberId = req.user ? req.user.id : undefined;
    const isIncludePending = includePending === 'true';
    const isFeatured = featured === 'true';
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return this.newsService.getNews(
      isIncludePending,
      memberId,
      isFeatured,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  async getNewsById(@Param('id') id: string) {
    return this.newsService.getNewsById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @Post()
  async createNews(
    @Request() req: AuthenticatedRequest,
    @Body()
    data: {
      title: string;
      content: string;
      category: string;
      excerpt?: string;
      imageUrl?: string;
    },
  ) {
    return this.newsService.createNews(req.user.id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/approve')
  async approveNews(@Param('id') id: string) {
    return this.newsService.approveNews(id);
  }

  @UseGuards(AuthGuard('jwt'), ResourceOwnerGuard)
  @ResourceOwner({ resource: 'news' })
  @Delete(':id')
  async deleteNews(@Param('id') id: string) {
    return this.newsService.deleteNews(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ResourceOwnerGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @ResourceOwner({ resource: 'news' })
  @Put(':id')
  async updateNews(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() data: Partial<{ title: string; content: string; category: string }>,
  ) {
    return this.newsService.updateNews(id, req.user.id, req.user.role, data);
  }
}
