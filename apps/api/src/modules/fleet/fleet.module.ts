import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';

/** Flota: vehículos y conductores (prompt §20, §42). */
@Module({
  controllers: [VehiclesController, DriversController],
  providers: [VehiclesService, DriversService],
})
export class FleetModule {}
