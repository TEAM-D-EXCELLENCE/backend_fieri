import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClubSpaceController } from './club-space.controller';
import { ClubSpaceService } from './club-space.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClubSpaceController],
  providers: [ClubSpaceService],
  exports: [ClubSpaceService],
})
export class ClubSpaceModule {}
