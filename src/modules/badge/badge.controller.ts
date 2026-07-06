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
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { BadgeService } from './badge.service';

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
    @Body()
    data: {
      userId: number;
      userName: string;
      badgeType: string;
      awardedBy: string;
    },
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
