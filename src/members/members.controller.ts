import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MembersService } from './members.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const member = await this.membersService.getMemberById(req.user.id);
    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }
    return {
      success: true,
      message: 'Profil récupéré',
      data: member,
    };
  }

  @Get()
  async getMembers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return this.membersService.getMembers({
      search,
      role,
      page: pageNum,
      limit: limitNum,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  async getMember(@Param('id', ParseIntPipe) id: number) {
    const member = await this.membersService.getMemberById(id);
    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }
    return {
      success: true,
      data: member,
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.membersService.updateMemberRole(id, body.role, req.user.id);
  }
}
