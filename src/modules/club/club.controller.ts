import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ClubService } from './club.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { ClubFrom, ClubManagerGuard } from '../../auth/guards';

class CreateClubDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  discipline!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

class UpdateClubDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  discipline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}

class SetResponsibleDto {
  @IsInt()
  memberId!: number;
}

@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get()
  async getClubs(
    @Query('featured') featured?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return this.clubService.getClubs(pageNum, limitNum);
  }

  @Get(':id')
  async getClub(@Param('id') id: string) {
    return this.clubService.getClubById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createClub(
    @Body() data: CreateClubDto,
  ) {
    return this.clubService.createClub(data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, ClubManagerGuard)
  @Roles('ADMIN', 'RESPONSABLE')
  @ClubFrom({ param: 'id' })
  @Put(':id')
  async updateClub(
    @Param('id') id: string,
    @Body() data: UpdateClubDto,
  ) {
    return this.clubService.updateClub(id, data);
  }

  /**
   * Nomme le responsable d'un club — réservé à l'ADMIN global (retour client).
   * L'écran de gestion n'offrait que « Retirer » ; il manquait « Nommer
   * responsable ».
   */
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/responsible')
  async setResponsible(
    @Param('id') id: string,
    @Body() body: SetResponsibleDto,
  ) {
    return this.clubService.setResponsible(id, body.memberId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async deleteClub(@Param('id') id: string) {
    return this.clubService.deleteClub(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  async joinClub(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.joinClubDirect(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/join')
  async leaveClub(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.clubService.leaveClubDirect(id, req.user.id);
  }
}
