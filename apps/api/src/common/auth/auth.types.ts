/** Payload del access token JWT. */
export interface JwtPayload {
  sub: string; // userId
  companyId: string;
  roles: string[];
  permissions: string[];
}

/** Usuario autenticado inyectado en `request.user`. */
export interface AuthUser {
  userId: string;
  companyId: string;
  roles: string[];
  permissions: string[];
}
