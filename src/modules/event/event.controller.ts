import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { EventService } from './event.service';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import {
  EventManagerGuard,
  EventPosts,
  EventRegistrantGuard,
} from '../../auth/guards';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getEvents(
    @Query('scope') scope?: string,
    @Query('universityId') universityId?: string,
    @Query('clubId') clubId?: string,
  ) {
    return this.eventService.getEvents({
      scope: scope === 'past' || scope === 'upcoming' ? scope : undefined,
      universityId: universityId ? Number(universityId) : undefined,
      clubId: clubId || undefined,
    });
  }

  // Doit être déclaré AVANT `:id` pour ne pas être capturé par le paramètre.
  @Get('history')
  async getHistory(
    @Query('universityId') universityId?: string,
    @Query('clubId') clubId?: string,
  ) {
    return this.eventService.getHistory({
      universityId: universityId ? Number(universityId) : undefined,
      clubId: clubId || undefined,
    });
  }

  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.eventService.getEventById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'RESPONSABLE')
  @Post()
  async createEvent(
    @Body()
    data: {
      title: string;
      date: string;
      endDate?: string;
      description?: string;
      isLive?: boolean;
      streamUrl?: string;
      clubId?: string;
      universityId?: number;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventService.createEvent(data, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'RESPONSABLE')
  @Put(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      title: string;
      date: string;
      isLive: boolean;
      streamUrl: string;
    }>,
  ) {
    return this.eventService.updateEvent(id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/register')
  async register(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventService.registerToEvent(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/register')
  async deregister(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventService.deregisterFromEvent(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), EventRegistrantGuard)
  @Get(':id/stream')
  async getStream(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.eventService.getEventStream(id, req.user.id);
  }

  /** Liste des inscrits — RESP_COMM / CHEF_UNIV / organisateur. */
  @UseGuards(AuthGuard('jwt'), EventManagerGuard)
  @EventPosts('RESP_COMMUNICATION', 'CHEF_UNIVERSITAIRE')
  @Get(':id/registrants')
  async registrants(@Param('id') id: string) {
    return this.eventService.getRegistrants(id);
  }

  /** Marque les présences effectives — organisateur / responsable / chef. */
  @UseGuards(AuthGuard('jwt'), EventManagerGuard)
  @EventPosts('RESP_COMMUNICATION', 'CHEF_UNIVERSITAIRE')
  @Post(':id/mark-attendance')
  async markAttendance(
    @Param('id') id: string,
    @Body() body: { memberIds: number[] },
  ) {
    return this.eventService.markAttendance(id, body.memberIds);
  }

  /** Publication réseaux sociaux (OAuth mockée) — RESP_COMM / CHEF_UNIV. */
  @UseGuards(AuthGuard('jwt'), EventManagerGuard)
  @EventPosts('RESP_COMMUNICATION', 'CHEF_UNIVERSITAIRE')
  @Post(':id/publish-social')
  async publishSocial(@Param('id') id: string) {
    return this.eventService.publishSocial(id);
  }
}
