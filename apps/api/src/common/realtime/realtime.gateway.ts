import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.types';

/**
 * Gateway de tiempo real (socket.io, en proceso — sin infra externa).
 * Autentica el handshake con el access token (query `auth.token`) y une al
 * cliente a las salas `company:<id>` y `user:<id>` para emisión dirigida.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger('Realtime');

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      client.join(`company:${payload.companyId}`);
      client.join(`user:${payload.sub}`);
    } catch {
      // Token inválido/expirado: se rechaza la conexión.
      client.disconnect(true);
    }
  }
}
