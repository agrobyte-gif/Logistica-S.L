import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DocumentStatus, Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { FinanceService } from './finance.service';
import { PayablesService } from './payables.service';
import {
  CreateSupplierInvoiceDto,
  RegisterSupplierPaymentDto,
} from './dto/supplier-invoice.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly payables: PayablesService,
  ) {}

  // --- Resúmenes CxC / CxP ---
  @Get('receivables')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'Cuentas por cobrar (con vencimiento)' })
  receivables(@CurrentUser() user: AuthUser) {
    return this.finance.receivables(user.companyId);
  }

  @Get('payables')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'Cuentas por pagar (con vencimiento)' })
  payablesSummary(@CurrentUser() user: AuthUser) {
    return this.finance.payables(user.companyId);
  }

  @Get('kpis')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'KPIs financieros' })
  kpis(@CurrentUser() user: AuthUser) {
    return this.finance.kpis(user.companyId);
  }

  // --- Facturas de proveedor (CxP) ---
  @Get('supplier-invoices')
  @RequirePermissions(Permission.PAYABLE_READ)
  @ApiOperation({ summary: 'Listar facturas de proveedor' })
  @ApiQuery({ name: 'estado', required: false, enum: DocumentStatus })
  listSupplierInvoices(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
    @Query('estado') estado?: DocumentStatus,
  ) {
    return this.payables.findAll(user.companyId, query, estado);
  }

  @Post('supplier-invoices')
  @RequirePermissions(Permission.PAYABLE_MANAGE)
  @ApiOperation({ summary: 'Registrar factura de proveedor' })
  createSupplierInvoice(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupplierInvoiceDto,
  ) {
    return this.payables.create(user.companyId, user.userId, dto);
  }

  @Post('supplier-invoices/:id/payments')
  @RequirePermissions(Permission.PAYABLE_MANAGE)
  @ApiOperation({ summary: 'Registrar pago a proveedor' })
  paySupplier(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RegisterSupplierPaymentDto,
  ) {
    return this.payables.registerPayment(user.companyId, user.userId, id, dto);
  }
}
