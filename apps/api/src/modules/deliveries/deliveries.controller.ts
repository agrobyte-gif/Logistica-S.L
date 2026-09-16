import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { DeliveriesService } from './deliveries.service';
import { RecordDeliveryDto } from './dto/delivery.dto';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get()
  @RequirePermissions(Permission.DELIVERY_READ)
  @ApiOperation({ summary: 'Listar entregas' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.deliveries.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.DELIVERY_READ)
  @ApiOperation({ summary: 'Detalle de entrega (ítems + evidencia)' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deliveries.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.DELIVERY_EXECUTE)
  @ApiOperation({ summary: 'Registrar entrega (app del conductor)' })
  record(@CurrentUser() user: AuthUser, @Body() dto: RecordDeliveryDto) {
    return this.deliveries.record(user.companyId, user.userId, dto);
  }
}
