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
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
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

class CreateNewsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content!: string;

  @IsString()
  @MaxLength(60)
  category!: string;

  // Champs ajoutés en amont (synthèse de carte + illustration issue d'un upload).
  // Déclarés ici pour que le `whitelist` ne les supprime pas silencieusement.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;
}

class UpdateNewsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;
}

class ReactNewsDto {
  @IsIn(['LIKE', 'DISLIKE'], { message: 'Réaction invalide (LIKE ou DISLIKE).' })
  value!: string;
}

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

  // JWT optionnel : un visiteur voit les compteurs, un membre connecté voit en
  // plus SA réaction (pour afficher le bouton actif).
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async getNewsById(
    @Param('id') id: string,
    @Request() req: OptionalAuthRequest,
  ) {
    return this.newsService.getNewsById(id, req.user?.id);
  }

  /** Réagir à un article : « J'adore » (LIKE) ou « J'aime pas » (DISLIKE). */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/react')
  async react(
    @Param('id') id: string,
    @Body() body: ReactNewsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.newsService.reactToNews(id, req.user.id, body.value);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHERCHEUR', 'ADMIN')
  @Post()
  async createNews(
    @Request() req: AuthenticatedRequest,
    @Body() data: CreateNewsDto,
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
    @Body() data: UpdateNewsDto,
  ) {
    return this.newsService.updateNews(id, req.user.id, req.user.role, data);
  }
}
