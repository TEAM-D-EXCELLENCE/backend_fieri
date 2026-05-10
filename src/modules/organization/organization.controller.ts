import { Controller, Get } from '@nestjs/common';
import { OrganizationService } from './organization.service';

@Controller()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get('countries')
  getCountries() {
    return this.organizationService.getCountries();
  }
}
