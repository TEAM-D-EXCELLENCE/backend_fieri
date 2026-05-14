import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { OrganizationService } from './organization.service';

@Controller() 
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // Route: GET /countries
  @Get('countries')
  findAllCountries() {
    return this.organizationService.getCountries();
  }

  // Route: GET /countries/:id/universities
  // Exemple: /countries/1/universities
  @Get('countries/:id/universities')
  findUniversities(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getUniversitiesByCountry(id);
  }

  // Route: GET /universities/:id/branches
  // Exemple: /universities/1/branches
  @Get('universities/:id/branches')
  findBranches(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getBranchesByUniversity(id);
  }

  // GET /branches/1
  @Get('branches/:id')
  findOneBranch(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getBranchById(id);
  }

  // GET /countries/:id
  @Get('countries/:id')
  findOneCountry(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getCountryById(id);
  }

  // GET /universities/:id
  @Get('universities/:id')
  findOneUniversity(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getUniversityById(id);
  }
}