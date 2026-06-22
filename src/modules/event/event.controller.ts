import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getEvents() {
    return this.eventService.getEvents();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/register')
  async register(@Param('id') id: string, @Request() req) {
    return this.eventService.registerToEvent(id, req.user.id);
  }
}
