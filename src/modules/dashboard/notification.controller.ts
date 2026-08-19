import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { ResourceOwner, ResourceOwnerGuard } from '../../auth/guards';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getNotifications(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.getMyNotifications(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), ResourceOwnerGuard)
  @ResourceOwner({ resource: 'notification', adminBypass: false })
  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.dashboardService.markNotificationAsRead(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete()
  async clearNotifications(@Request() req: AuthenticatedRequest) {
    return this.dashboardService.clearMyNotifications(req.user.id);
  }
}
