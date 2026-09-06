import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { ContactMessageDto } from './contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  async submitMessage(@Body() data: ContactMessageDto) {
    return this.contactService.submitContactMessage(data);
  }
}
