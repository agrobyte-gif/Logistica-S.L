import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { InventoryService } from './inventory.service';
import {
  AdjustInventoryDto,
  MovementsQueryDto,
  TransferInventoryDto,
} from './dto/inventory.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('stock')
  @RequirePermissions(Permission.INVENTORY_READ)
  @ApiOperation({ summary: 'Stock por producto y bodega' })
  getStock(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.inventory.getStock(user.companyId, query);
  }

  @Get('movements')
  @RequirePermissions(Permission.INVENTORY_MOVEMENT_READ)
  @ApiOperation({ summary: 'Movimientos de inventario (libro mayor)' })
  @ApiQuery({ name: 'productId', required: false })
  listMovements(
    @CurrentUser() user: AuthUser,
    @Query() query: MovementsQueryDto,
  ) {
    return this.inventory.listMovements(user.companyId, query, query.productId);
  }

  @Post('adjust')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Ajuste de inventario (con motivo)' })
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustInventoryDto) {
    return this.inventory.adjust(user.companyId, user.userId, dto);
  }

  @Post('transfer')
  @RequirePermissions(Permission.INVENTORY_TRANSFER)
  @ApiOperation({ summary: 'Transferencia entre bodegas' })
  transfer(@CurrentUser() user: AuthUser, @Body() dto: TransferInventoryDto) {
    return this.inventory.transfer(user.companyId, user.userId, dto);
  }
}
