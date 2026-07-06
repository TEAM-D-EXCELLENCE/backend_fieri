import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Cherche le token dans "Authorization: Bearer ..."
      ignoreExpiration: false,
      secretOrKey: 'MA_CLE_SUPER_SECRETE_123', // DOIT ÊTRE LA MÊME QUE DANS AUTH.MODULE
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
