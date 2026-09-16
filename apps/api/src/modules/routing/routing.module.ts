import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { QualityModule } from '../quality/quality.module';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';

@Module({
  imports: [InventoryModule, QualityModule],
  controllers: [RoutingController],
  providers: [RoutingService],
})
export class RoutingModule {}
