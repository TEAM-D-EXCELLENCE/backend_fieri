import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    return this.dashboardService.getPlatformStats();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('dashboard/me')
  async getMyStats(@Request() req) {
    return this.dashboardService.getMyStats(req.user.id);
  }
}
