import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission, PurchaseOrderStatus } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  CreateReceiptDto,
  PurchaseOrderQueryDto,
} from './dto/purchase-order.dto';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly orders: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions(Permission.PURCHASE_ORDER_READ)
  @ApiOperation({ summary: 'Listar órdenes de compra' })
  @ApiQuery({ name: 'estado', required: false, enum: PurchaseOrderStatus })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PurchaseOrderQueryDto) {
    return this.orders.findAll(user.companyId, query, query.estado);
  }

  @Get(':id')
  @RequirePermissions(Permission.PURCHASE_ORDER_READ)
  @ApiOperation({ summary: 'Detalle de la orden de compra' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.PURCHASE_ORDER_CREATE)
  @ApiOperation({ summary: 'Crear orden de compra' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.orders.create(user.companyId, user.userId, dto);
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.PURCHASE_ORDER_APPROVE)
  @ApiOperation({ summary: 'Aprobar OC (valida umbral por monto §41)' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.approve(user.companyId, user, id);
  }

  @Post(':id/receive')
  @RequirePermissions(Permission.GOODS_RECEIPT_CREATE)
  @ApiOperation({ summary: 'Recepcionar mercadería (ingresa stock)' })
  receive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateReceiptDto,
  ) {
    return this.orders.receive(user.companyId, user.userId, id, dto);
  }
}
