import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { getJwtSecret } from "./auth.config.js";
import { extractAuthToken } from "./auth.cookie.js";
import type { AuthTokenPayload } from "./auth.types.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: extractAuthToken,
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  validate(payload: AuthTokenPayload): AuthTokenPayload {
    return payload;
  }
}
