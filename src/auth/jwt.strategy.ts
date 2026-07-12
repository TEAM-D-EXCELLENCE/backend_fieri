import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

// Fail-fast : impossible de démarrer sans clé JWT (évite un secret undefined en prod)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant : définis-le dans .env (local) et dans Vercel (prod)');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Cherche le token dans "Authorization: Bearer ..."
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET!, // garanti défini par le fail-fast ci-dessus
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
