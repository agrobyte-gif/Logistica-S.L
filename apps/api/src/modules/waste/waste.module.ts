import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { WasteService } from './waste.service';
import { WasteController } from './waste.controller';

@Module({
  imports: [InventoryModule],
  controllers: [WasteController],
  providers: [WasteService],
})
export class WasteModule {}
