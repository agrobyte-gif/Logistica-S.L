import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission, PurchaseRequestStatus } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PurchasingService } from './purchasing.service';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchase-requests')
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  @Get()
  @RequirePermissions(Permission.PURCHASE_REQUEST_READ)
  @ApiOperation({ summary: 'Listar necesidades de compra' })
  @ApiQuery({ name: 'estado', required: false, enum: PurchaseRequestStatus })
  findRequests(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
    @Query('estado') estado?: PurchaseRequestStatus,
  ) {
    return this.purchasing.findRequests(user.companyId, query, estado);
  }
}
