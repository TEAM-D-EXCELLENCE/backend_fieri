import { Module } from '@nestjs/common';
import { ClubController } from './club.controller';
import { MembershipController } from './membership.controller';
import { ClubService } from './club.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClubController, MembershipController],
  providers: [ClubService],
  exports: [ClubService],
})
export class ClubModule {}
