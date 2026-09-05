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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateCategoryDto } from './dto/category.dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('categories')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({ summary: 'Listar categorías' })
  listCategories(@CurrentUser() user: AuthUser) {
    return this.products.listCategories(user.companyId);
  }

  @Post('categories')
  @RequirePermissions(Permission.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Crear categoría' })
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.products.createCategory(user.companyId, dto);
  }

  @Get('products')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({ summary: 'Listar productos (paginado, con búsqueda)' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.products.findAll(user.companyId, query);
  }

  @Get('products/:id')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({ summary: 'Detalle de producto' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.findOne(user.companyId, id);
  }

  @Post('products')
  @RequirePermissions(Permission.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Crear producto' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.companyId, user.userId, dto);
  }

  @Patch('products/:id')
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.companyId, user.userId, id, dto);
  }
}
