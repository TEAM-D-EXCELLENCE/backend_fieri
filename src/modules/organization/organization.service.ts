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

  // Récupérer un pays spécifique par son ID
  async getCountryById(id: number) {
    const country = await this.prisma.country.findUnique({
      where: { id },
    });
    return {
      success: true,
      message: "Détails du pays récupérés",
      data: country,
    };
  }

  // Récupérer une université spécifique par son ID
  async getUniversityById(id: number) {
    const university = await this.prisma.university.findUnique({
      where: { id },
      include: { country: true } // Inclus le pays pour plus de détails côté front
    });
    return {
      success: true,
      message: "Détails de l'université récupérés",
      data: university,
    };
  }

async createCountry(name: string) {
    const country = await this.prisma.country.create({
      data: { name },
    });
    return { success: true, message: "Pays créé avec succès", data: country };
  }

  async createUniversity(name: string, countryId: number) {
    const university = await this.prisma.university.create({
      data: { name, countryId },
    });
    return { success: true, message: "Université créée avec succès", data: university };
  }

  async createBranch(name: string, universityId: number) {
    const branch = await this.prisma.branch.create({
      data: { name, universityId },
    });
    return { success: true, message: "Branche créée avec succès", data: branch };
  }

  async getUniversities() {
    const universities = await this.prisma.university.findMany({
      orderBy: { name: 'asc' },
    });
    return {
      success: true,
      message: 'Liste de toutes les universités récupérée',
      data: universities,
    };
  }

  async getBranches() {
    const branches = await this.prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });
    return {
      success: true,
      message: 'Liste de toutes les branches récupérée',
      data: branches,
    };
  }
}
