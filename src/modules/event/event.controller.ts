import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getEvents() {
    return this.eventService.getEvents();
  }

  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.eventService.getEventById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createEvent(
    @Body()
    data: {
      title: string;
      date: string;
      isLive?: boolean;
      streamUrl?: string;
    },
  ) {
    return this.eventService.createEvent(data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
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
  async register(@Param('id') id: string, @Request() req) {
    return this.eventService.registerToEvent(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/register')
  async deregister(@Param('id') id: string, @Request() req) {
    return this.eventService.deregisterFromEvent(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/stream')
  async getStream(@Param('id') id: string, @Request() req) {
    return this.eventService.getEventStream(id, req.user.id);
  }
}
