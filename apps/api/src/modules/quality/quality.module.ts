import { Module } from '@nestjs/common';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';

@Module({
  controllers: [QualityController],
  providers: [QualityService],
  // Exportado: el despacho consulta el último control antes de la salida.
  exports: [QualityService],
})
export class QualityModule {}
