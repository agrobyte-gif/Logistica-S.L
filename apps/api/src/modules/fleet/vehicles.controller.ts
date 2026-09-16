import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @RequirePermissions(Permission.VEHICLE_READ)
  @ApiOperation({ summary: 'Listar vehículos' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.vehicles.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.VEHICLE_READ)
  @ApiOperation({ summary: 'Detalle de vehículo' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.VEHICLE_MANAGE)
  @ApiOperation({ summary: 'Crear vehículo' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user.companyId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.VEHICLE_MANAGE)
  @ApiOperation({ summary: 'Actualizar vehículo' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(user.companyId, user.userId, id, dto);
  }
}
