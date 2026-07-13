import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UniversityPostGuard } from '../../auth/university-post.guard';
import { UniversityPosts } from '../../auth/university-post.decorator';
import { TreasuryService } from './treasury.service';
import type { RecordTransactionDto } from './treasury.service';

@Controller('universities')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  /** Grand livre de trésorerie — Trésorier ou Chef Universitaire de l'université. */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('TRESORIER', 'CHEF_UNIVERSITAIRE')
  @Get(':id/treasury')
  async getTreasury(@Param('id', ParseIntPipe) id: number) {
    return this.treasuryService.getTreasury(id);
  }

  /** Enregistrement d'une transaction — Trésorier de l'université. */
  @UseGuards(AuthGuard('jwt'), UniversityPostGuard)
  @UniversityPosts('TRESORIER')
  @Post(':id/treasury/transactions')
  async recordTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordTransactionDto,
    @Request() req,
  ) {
    return this.treasuryService.recordTransaction(id, dto, req.user.id);
  }
}
