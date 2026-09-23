import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

// Global: cualquier módulo puede inyectar RealtimeService para emitir eventos.
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
