import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './organization/organization.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [OrganizationModule, AuthModule, MembersModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
