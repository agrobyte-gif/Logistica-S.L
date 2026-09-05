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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions(Permission.SUPPLIER_READ)
  @ApiOperation({ summary: 'Listar proveedores' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.suppliers.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.SUPPLIER_READ)
  @ApiOperation({ summary: 'Detalle de proveedor' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.suppliers.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.SUPPLIER_CREATE)
  @ApiOperation({ summary: 'Crear proveedor' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user.companyId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SUPPLIER_UPDATE)
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(user.companyId, user.userId, id, dto);
  }
}
