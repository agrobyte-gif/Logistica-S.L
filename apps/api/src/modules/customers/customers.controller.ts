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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions(Permission.CUSTOMER_READ)
  @ApiOperation({ summary: 'Listar clientes (paginado, con búsqueda)' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.customers.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOMER_READ)
  @ApiOperation({ summary: 'Detalle de cliente' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.CUSTOMER_CREATE)
  @ApiOperation({ summary: 'Crear cliente' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user.companyId, user.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user.companyId, user.userId, id, dto);
  }
}
