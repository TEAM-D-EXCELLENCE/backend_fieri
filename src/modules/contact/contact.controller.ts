import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  async submitMessage(
    @Body()
    data: {
      name: string;
      email: string;
      subject: string;
      message: string;
    },
  ) {
    return this.contactService.submitContactMessage(data);
  }
}
