import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { CashService } from './cash.service';
import { CashMovementDto, OpenCashDto } from './dto/cash.dto';

@ApiTags('cash')
@ApiBearerAuth()
@Controller('cash')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get('registers')
  @RequirePermissions(Permission.CASH_READ)
  @ApiOperation({ summary: 'Listar cajas' })
  list(@CurrentUser() user: AuthUser) {
    return this.cash.list(user.companyId);
  }

  @Get('registers/:id')
  @RequirePermissions(Permission.CASH_READ)
  @ApiOperation({ summary: 'Detalle de caja con movimientos' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cash.findOne(user.companyId, id);
  }

  @Get('registers/:id/summary')
  @RequirePermissions(Permission.CASH_READ)
  @ApiOperation({ summary: 'Gastos por categoría de la caja' })
  summary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cash.summaryByCategory(user.companyId, id);
  }

  @Post('registers')
  @RequirePermissions(Permission.CASH_MANAGE)
  @ApiOperation({ summary: 'Abrir caja' })
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenCashDto) {
    return this.cash.open(user.companyId, user.userId, dto);
  }

  @Post('registers/:id/movements')
  @RequirePermissions(Permission.CASH_MANAGE)
  @ApiOperation({ summary: 'Registrar ingreso/egreso' })
  addMovement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CashMovementDto,
  ) {
    return this.cash.addMovement(user.companyId, user.userId, id, dto);
  }

  @Post('registers/:id/close')
  @RequirePermissions(Permission.CASH_MANAGE)
  @ApiOperation({ summary: 'Cerrar caja (rendición)' })
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cash.close(user.companyId, user.userId, id);
  }
}
