import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async submitContactMessage(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    await this.prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    });

    return {
      success: true,
      message: 'Votre message a été transmis avec succès.',
    };
  }
}
