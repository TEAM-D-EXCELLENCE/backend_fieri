import { Module } from '@nestjs/common';
import { WorkshopController } from './workshop.controller';
import { FormationsController } from './formations.controller';
import { WorkshopService } from './workshop.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkshopController, FormationsController],
  providers: [WorkshopService],
  exports: [WorkshopService],
})
export class WorkshopModule {}
