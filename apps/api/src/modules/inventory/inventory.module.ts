import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  // Exportado: recepciones y mermas usan applyMovement (único punto de mutación).
  exports: [InventoryService],
})
export class InventoryModule {}
