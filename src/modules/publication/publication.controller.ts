import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { PublicationService } from './publication.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

class CreatePublicationDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(80)
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  clubId?: string;
}

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
    @Request() req: AuthenticatedRequest,
    @Body() data: CreatePublicationDto,
  ) {
    return this.publicationService.createPublication(req.user.id, data);
  }
}
