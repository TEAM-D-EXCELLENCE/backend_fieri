import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fail-fast : impossible de démarrer sans clé JWT (évite un secret undefined en prod)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant : définis-le dans .env (local) et dans Vercel (prod)');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Cherche le token dans "Authorization: Bearer ..."
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET!, // garanti défini par le fail-fast ci-dessus
    });
  }

  /**
   * Vérifie à CHAQUE requête authentifiée que le compte est toujours actif.
   * Permet la suspension immédiate d'accès : dès qu'une exclusion est demandée
   * (`deletionRequested`) ou que le compte est archivé (`isActive=false`), le
   * token est rejeté (401) — déconnexion forcée côté client. Le rôle est lu en
   * base pour que les changements de droits prennent effet immédiatement.
   */
  async validate(payload: any) {
    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deletionRequested: true,
      },
    });
    if (!member || member.deletionRequested || !member.isActive) {
      throw new UnauthorizedException('Accès suspendu ou compte introuvable.');
    }
    return { id: member.id, email: member.email, role: member.role };
  }
}
