import { Module } from '@nestjs/common';
import { ResearcherController } from './researcher.controller';
import { ResearcherService } from './researcher.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResearcherController],
  providers: [ResearcherService],
  exports: [ResearcherService],
})
export class ResearcherModule {}
