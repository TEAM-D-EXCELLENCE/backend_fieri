import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Inscription d'un nouveau membre
  async register(data: any) {
    // 1. Vérifier si l'email existe déjà
    const existing = await this.prisma.member.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // 2. Hacher le mot de passe (10 tours de "salt")
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3. Créer le membre en base de données
    const member = await this.prisma.member.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstname: data.firstName,
        lastname: data.lastName,
        branchId: data.branchId,
        role: data.role || 'CHERCHEUR',
      },
    });

    // 4. Générer le token d'accès
    const payload = { sub: member.id, email: member.email, role: member.role };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Inscription réussie',
      data: {
        access_token,
        member: {
          id: member.id,
          email: member.email,
          firstName: member.firstname,
          lastName: member.lastname,
          role: member.role,
        },
      },
    };
  }

  // Connexion d'un membre
  async login(email: string, pass: string) {
    // 1. Chercher le membre par son email
    const member = await this.prisma.member.findUnique({
      where: { email },
    });

    if (!member) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // 2. Comparer le mot de passe saisi avec le hash stocké
    const isMatch = await bcrypt.compare(pass, member.password);

    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // 3. Préparer le payload du JWT (ID, Email et Rôle)
    const payload = { sub: member.id, email: member.email, role: member.role };

    // 4. Retourner le token et les infos de base
    return {
      success: true,
      message: 'Connexion réussie',
      data: {
        access_token: await this.jwtService.signAsync(payload),
        member: {
          id: member.id,
          email: member.email,
          firstName: member.firstname,
          lastName: member.lastname,
          role: member.role,
        },
      },
    };
  }
}