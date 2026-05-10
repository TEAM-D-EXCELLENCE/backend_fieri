import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async getCountries() {
    const countries = await this.prisma.country.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      message: 'Liste des pays récupérée',
      data: countries,
    };
  }
}
