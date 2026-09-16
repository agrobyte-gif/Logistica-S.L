import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { QualityService } from './quality.service';
import { CreateQualityCheckDto } from './dto/quality.dto';

@ApiTags('quality')
@ApiBearerAuth()
@Controller('quality-checks')
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Get('order/:salesOrderId')
  @RequirePermissions(Permission.QUALITY_READ)
  @ApiOperation({ summary: 'Controles de calidad de un pedido' })
  listForOrder(
    @CurrentUser() user: AuthUser,
    @Param('salesOrderId') salesOrderId: string,
  ) {
    return this.quality.listForOrder(user.companyId, salesOrderId);
  }

  @Post()
  @RequirePermissions(Permission.QUALITY_CHECK)
  @ApiOperation({ summary: 'Registrar control de calidad' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQualityCheckDto) {
    return this.quality.create(user.companyId, user.userId, dto);
  }
}
