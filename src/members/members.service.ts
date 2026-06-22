import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async getMemberById(id: number) {
    const member = await this.prisma.member.findUnique({
      where: { id },
    });
    if (!member) return null;
    return {
      id: member.id,
      email: member.email,
      firstName: member.firstname,
      lastName: member.lastname,
      role: member.role,
    };
  }
}
