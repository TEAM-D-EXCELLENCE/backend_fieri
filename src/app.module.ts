import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { OpportunityModule } from './modules/opportunity/opportunity.module';
import { PublicationModule } from './modules/publication/publication.module';
import { ContributionModule } from './modules/contribution/contribution.module';
import { CommonModule } from './common/common.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { SupportModule } from './modules/support/support.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { ClubSpaceModule } from './modules/club-space/club-space.module';
import { CompetitionModule } from './modules/competition/competition.module';

@Module({
  imports: [
    // Limite globale : 60 requêtes / minute par IP (les endpoints sensibles
    // sont restreints individuellement via @Throttle).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
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
    OpportunityModule,
    PublicationModule,
    ContributionModule,
    CommonModule,
    TreasuryModule,
    SupportModule,
    CertificateModule,
    GovernanceModule,
    ClubSpaceModule,
    CompetitionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Garde anti-bruteforce globale : 60 requêtes / minute par IP par
    // défaut, restreinte sur les endpoints sensibles via @Throttle.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
