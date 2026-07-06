import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('countries')
  async createCountry(@Body('name') name: string) {
    return this.organizationService.createCountry(name);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('universities')
  async createUniversity(
    @Body('name') name: string,
    @Body('countryId', ParseIntPipe) countryId: number,
  ) {
    return this.organizationService.createUniversity(name, countryId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('branches')
  async createBranch(
    @Body('name') name: string,
    @Body('universityId', ParseIntPipe) universityId: number,
  ) {
    return this.organizationService.createBranch(name, universityId);
  }

  @Get('universities')
  findAllUniversities() {
    return this.organizationService.getUniversities();
  }

  @Get('branches')
  findAllBranches() {
    return this.organizationService.getBranches();
  }
}
