import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  /** El valor retornado se inyecta como `request.user`. */
  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      companyId: payload.companyId,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
