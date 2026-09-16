import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission, SalesOrderStatus } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { SalesService } from './sales.service';
import {
  CreateSalesOrderDto,
  SalesOrderQueryDto,
  TransitionOrderDto,
} from './dto/sales-order.dto';

@ApiTags('sales-orders')
@ApiBearerAuth()
@Controller('sales-orders')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @RequirePermissions(Permission.SALES_ORDER_READ)
  @ApiOperation({ summary: 'Listar pedidos' })
  @ApiQuery({ name: 'estado', required: false, enum: SalesOrderStatus })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SalesOrderQueryDto) {
    return this.sales.findAll(user.companyId, query, query.estado);
  }

  @Get(':id')
  @RequirePermissions(Permission.SALES_ORDER_READ)
  @ApiOperation({ summary: 'Detalle del pedido' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sales.findOne(user.companyId, id);
  }

  @Get(':id/timeline')
  @RequirePermissions(Permission.SALES_ORDER_READ)
  @ApiOperation({ summary: 'Línea de tiempo (trazabilidad) del pedido' })
  timeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sales.timeline(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.SALES_ORDER_CREATE)
  @ApiOperation({
    summary: 'Crear pedido (valida stock y genera necesidades de compra)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSalesOrderDto) {
    return this.sales.create(user.companyId, user.userId, dto);
  }

  @Post(':id/transition')
  @RequirePermissions(Permission.SALES_ORDER_TRANSITION)
  @ApiOperation({ summary: 'Cambiar el estado del pedido' })
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransitionOrderDto,
  ) {
    return this.sales.transition(user.companyId, user.userId, id, dto);
  }
}
