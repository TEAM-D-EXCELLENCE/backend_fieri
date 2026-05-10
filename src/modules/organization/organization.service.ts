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

  async getUniversitiesByCountry(countryId: number) {
    const data = await this.prisma.university.findMany({
      where: { countryId }
    });
    return { success: true, message: "Universités récupérées", data };
  }

  async getBranchesByUniversity(universityId: number) {
    const data = await this.prisma.branch.findMany({
      where: { universityId }
    });
    return { success: true, message: "Branches récupérées", data };
  }

  async getBranchById(id: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { university: { include: { country: true } } } // Optionnel: récupère aussi l'université et le pays lié
    });
    return {
      success: true,
      message: "Détails de la branche récupérés",
      data: branch
    };
  }
}
