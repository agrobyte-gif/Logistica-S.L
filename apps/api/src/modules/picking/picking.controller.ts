import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PickingStatus, Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PickingService } from './picking.service';
import {
  AssignPickerDto,
  CreatePickingDto,
  PickingQueryDto,
  UpdatePickingItemDto,
} from './dto/picking.dto';

@ApiTags('pickings')
@ApiBearerAuth()
@Controller('pickings')
export class PickingController {
  constructor(private readonly picking: PickingService) {}

  @Get()
  @RequirePermissions(Permission.PICKING_READ)
  @ApiOperation({ summary: 'Listar pickings' })
  @ApiQuery({ name: 'estado', required: false, enum: PickingStatus })
  @ApiQuery({ name: 'pickerId', required: false })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PickingQueryDto) {
    return this.picking.findAll(
      user.companyId,
      query,
      query.estado,
      query.pickerId,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.PICKING_READ)
  @ApiOperation({ summary: 'Detalle del picking' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.picking.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.PICKING_CREATE)
  @ApiOperation({ summary: 'Crear picking de un pedido' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePickingDto) {
    return this.picking.create(user.companyId, user.userId, dto);
  }

  @Post(':id/assign')
  @RequirePermissions(Permission.PICKING_CREATE)
  @ApiOperation({ summary: 'Asignar picker' })
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignPickerDto,
  ) {
    return this.picking.assign(user.companyId, user.userId, id, dto);
  }

  @Post(':id/start')
  @RequirePermissions(Permission.PICKING_EXECUTE)
  @ApiOperation({ summary: 'Iniciar picking' })
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.picking.start(user.companyId, user.userId, id);
  }

  @Post(':id/items/:itemId')
  @RequirePermissions(Permission.PICKING_EXECUTE)
  @ApiOperation({ summary: 'Actualizar una línea (cantidad/faltante/sustitución)' })
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePickingItemDto,
  ) {
    return this.picking.updateItem(user.companyId, user.userId, id, itemId, dto);
  }

  @Post(':id/finalize')
  @RequirePermissions(Permission.PICKING_EXECUTE)
  @ApiOperation({ summary: 'Cerrar picking (bloquea diferencias sin justificar)' })
  finalize(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.picking.finalize(user.companyId, user.userId, id);
  }
}
