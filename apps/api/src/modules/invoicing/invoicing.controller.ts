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
import { InvoicingService } from './invoicing.service';
import { CreateInvoiceDto, RegisterPaymentDto } from './dto/invoice.dto';

@ApiTags('invoicing')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicingController {
  constructor(private readonly invoicing: InvoicingService) {}

  @Get()
  @RequirePermissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: 'Listar documentos tributarios' })
  @ApiQuery({ name: 'estado', required: false, enum: DocumentStatus })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
    @Query('estado') estado?: DocumentStatus,
  ) {
    return this.invoicing.findAll(user.companyId, query, estado);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVOICE_READ)
  @ApiOperation({ summary: 'Detalle de documento con pagos' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicing.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions(Permission.INVOICE_MANAGE)
  @ApiOperation({ summary: 'Registrar DTE emitido en el SII' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicing.create(user.companyId, user.userId, dto);
  }

  @Post(':id/payments')
  @RequirePermissions(Permission.PAYMENT_REGISTER)
  @ApiOperation({ summary: 'Registrar pago/abono del cliente' })
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.invoicing.registerPayment(user.companyId, user.userId, id, dto);
  }

  @Post(':id/void')
  @RequirePermissions(Permission.INVOICE_MANAGE)
  @ApiOperation({ summary: 'Anular documento (sin pagos)' })
  voidInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicing.voidInvoice(user.companyId, user.userId, id);
  }
}
