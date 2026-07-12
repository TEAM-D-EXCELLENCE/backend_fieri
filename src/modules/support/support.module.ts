import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { GeniusPayService } from './genius-pay.service';

@Module({
  imports: [PrismaModule, TreasuryModule],
  controllers: [SupportController],
  providers: [SupportService, GeniusPayService],
  exports: [SupportService, GeniusPayService],
})
export class SupportModule {}
