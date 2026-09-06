import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { BadgeService } from './badge.service';

class AwardBadgeDto {
  @IsInt()
  userId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  userName!: string;

  // La liste blanche des types de badge reste vérifiée dans le service.
  @IsString()
  @MaxLength(40)
  badgeType!: string;

  @IsString()
  @MaxLength(120)
  awardedBy!: string;
}

@Controller('badges')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Get('user/:userId')
  async getBadgesByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.badgeService.getBadgesByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('MENTOR', 'ADMIN')
  @Post('award')
  async awardBadge(
    @Body() data: AwardBadgeDto,
  ) {
    return this.badgeService.awardBadge(data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('MENTOR', 'ADMIN')
  @Delete(':id')
  async revokeBadge(@Param('id') id: string) {
    return this.badgeService.revokeBadge(id);
  }
}
