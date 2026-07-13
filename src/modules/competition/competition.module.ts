import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChallengeController, HackathonController],
  providers: [ChallengeService, HackathonService],
  exports: [ChallengeService, HackathonService],
})
export class CompetitionModule {}
