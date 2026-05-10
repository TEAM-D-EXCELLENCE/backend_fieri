import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Optionnel : rend PrismaService disponible partout sans import manuel
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // <--- TRÈS IMPORTANT
})
export class PrismaModule {}