import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchasingService } from './purchasing.service';
import { PurchasingController } from './purchasing.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';

@Module({
  imports: [InventoryModule],
  controllers: [PurchasingController, PurchaseOrdersController],
  providers: [PurchasingService, PurchaseOrdersService],
})
export class PurchasingModule {}
