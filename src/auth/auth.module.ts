import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt'; // <--- Import indispensable
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { UniversityPostGuard } from './university-post.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    // C'est ici que la magie opère
    JwtModule.register({
      global: true, // Rend le module accessible partout sans le réimporter
      secret: process.env.JWT_SECRET, // Défini dans .env (local) et dans Vercel (prod)
      signOptions: { expiresIn: '24h' }, // Le token expirera après un jour
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    UniversityPostGuard,
    OptionalJwtAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, RolesGuard, UniversityPostGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
