import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { NotificationController } from './notification.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, NotificationController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
