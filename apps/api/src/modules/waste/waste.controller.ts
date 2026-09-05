import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { WasteService } from './waste.service';
import { CreateWasteDto } from './dto/waste.dto';

@ApiTags('waste')
@ApiBearerAuth()
@Controller('waste')
export class WasteController {
  constructor(private readonly waste: WasteService) {}

  @Get()
  @RequirePermissions(Permission.WASTE_READ)
  @ApiOperation({ summary: 'Listar mermas' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.waste.findAll(user.companyId, query);
  }

  @Get('summary')
  @RequirePermissions(Permission.WASTE_READ)
  @ApiOperation({ summary: 'Resumen de merma por motivo' })
  summary(@CurrentUser() user: AuthUser) {
    return this.waste.summaryByReason(user.companyId);
  }

  @Post()
  @RequirePermissions(Permission.WASTE_CREATE)
  @ApiOperation({ summary: 'Registrar merma (descuenta stock)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWasteDto) {
    return this.waste.create(user.companyId, user.userId, dto);
  }
}
