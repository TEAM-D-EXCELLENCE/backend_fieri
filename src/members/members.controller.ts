import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('members')
export class MembersController {
  
  @UseGuards(AuthGuard('jwt')) // Protège la route : seul un membre avec un token valide passe
  @Get('me')
  async getProfile(@Request() req) {
    // req.user contient ce qu'on a mis dans le payload du JWT (userId, email)
    // On peut renvoyer req.user directement ou chercher les infos complètes en base
    return {
      success: true,
      message: "Profil récupéré",
      data: req.user 
    };
  }
}