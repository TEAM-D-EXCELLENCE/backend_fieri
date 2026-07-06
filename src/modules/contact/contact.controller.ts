import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

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
