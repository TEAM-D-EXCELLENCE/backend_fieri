import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './modules/organization/organization.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './modules/project/project.module';
import { ClubModule } from './modules/club/club.module';
import { WorkshopModule } from './modules/workshop/workshop.module';
import { EventModule } from './modules/event/event.module';
import { ResearcherModule } from './modules/researcher/researcher.module';
import { NewsModule } from './modules/news/news.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ContactModule } from './modules/contact/contact.module';
import { TaskModule } from './modules/task/task.module';
import { BadgeModule } from './modules/badge/badge.module';
import { ApplicationModule } from './modules/application/application.module';

@Module({
  imports: [
    OrganizationModule,
    AuthModule,
    MembersModule,
    PrismaModule,
    ProjectModule,
    ClubModule,
    WorkshopModule,
    EventModule,
    ResearcherModule,
    NewsModule,
    DashboardModule,
    ContactModule,
    TaskModule,
    BadgeModule,
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
