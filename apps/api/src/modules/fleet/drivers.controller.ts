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
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  @RequirePermissions(Permission.DRIVER_READ)
  @ApiOperation({ summary: 'Listar conductores' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.drivers.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.DRIVER_READ)
  @ApiOperation({ summary: 'Detalle de conductor' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.drivers.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.DRIVER_MANAGE)
  @ApiOperation({ summary: 'Crear conductor' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDriverDto) {
    return this.drivers.create(user.companyId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DRIVER_MANAGE)
  @ApiOperation({ summary: 'Actualizar conductor' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.drivers.update(user.companyId, user.userId, id, dto);
  }
}
