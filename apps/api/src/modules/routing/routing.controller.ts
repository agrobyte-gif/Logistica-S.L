import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission, RouteStatus } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { RoutingService } from './routing.service';
import {
  AddStopDto,
  AssignRouteDto,
  CreateRouteDto,
  ReorderStopsDto,
  RouteQueryDto,
  TransitionRouteDto,
} from './dto/route.dto';

@ApiTags('routes')
@ApiBearerAuth()
@Controller('routes')
export class RoutingController {
  constructor(private readonly routing: RoutingService) {}

  @Get('dispatchable')
  @RequirePermissions(Permission.DISPATCH_READ)
  @ApiOperation({ summary: 'Centro de despacho: pedidos PREPARADOS por rutear' })
  dispatchable(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.routing.dispatchable(user.companyId, query);
  }

  @Get()
  @RequirePermissions(Permission.ROUTE_READ)
  @ApiOperation({ summary: 'Listar rutas' })
  @ApiQuery({ name: 'estado', required: false, enum: RouteStatus })
  findAll(@CurrentUser() user: AuthUser, @Query() query: RouteQueryDto) {
    return this.routing.findAll(user.companyId, query, query.estado);
  }

  @Get(':id')
  @RequirePermissions(Permission.ROUTE_READ)
  @ApiOperation({ summary: 'Detalle de ruta' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.routing.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Crear ruta con pedidos preparados' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRouteDto) {
    return this.routing.create(user.companyId, user.userId, dto);
  }

  @Post(':id/assign')
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Asignar vehículo y conductor' })
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignRouteDto,
  ) {
    return this.routing.assign(user.companyId, user.userId, id, dto);
  }

  @Post(':id/stops')
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Agregar parada (pedido) a la ruta' })
  addStop(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddStopDto,
  ) {
    return this.routing.addStop(user.companyId, user.userId, id, dto);
  }

  @Delete(':id/stops/:stopId')
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Quitar parada de la ruta' })
  removeStop(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('stopId') stopId: string,
  ) {
    return this.routing.removeStop(user.companyId, user.userId, id, stopId);
  }

  @Post(':id/reorder')
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Reordenar paradas' })
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReorderStopsDto,
  ) {
    return this.routing.reorder(user.companyId, user.userId, id, dto);
  }

  @Post(':id/transition')
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Transición manual (cargar / replanificar / cancelar)' })
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TransitionRouteDto,
  ) {
    return this.routing.transition(user.companyId, user.userId, id, dto);
  }

  @Post(':id/depart')
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Controlar salida (despacha stock y pasa a EN_RUTA)' })
  depart(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.routing.depart(user.companyId, user.userId, id);
  }

  @Post(':id/complete')
  @RequirePermissions(Permission.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'Cerrar ruta y liberar vehículo' })
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.routing.complete(user.companyId, user.userId, id);
  }
}
