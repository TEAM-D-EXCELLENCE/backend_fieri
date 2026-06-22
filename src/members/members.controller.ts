import { Controller, Get, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}
  
  @UseGuards(AuthGuard('jwt')) // Protège la route
  @Get('me')
  async getProfile(@Request() req) {
    // req.user contient le payload du JWT { id, email }
    const member = await this.membersService.getMemberById(req.user.id);
    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }
    return {
      success: true,
      message: "Profil récupéré",
      data: member 
    };
  }
}