import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { DteType } from '@agrogood/shared';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ description: 'Pedido asociado (opcional)' })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiProperty({ enum: DteType })
  @IsEnum(DteType)
  tipoDte!: DteType;

  @ApiProperty({ description: 'Folio del DTE emitido en el SII', example: '1045' })
  @IsString()
  @Length(1, 40)
  folio!: string;

  @ApiProperty({ description: 'Monto neto', example: 150000 })
  @IsNumber()
  @Min(0)
  neto!: number;

  @ApiPropertyOptional({ default: true, description: 'Afecto a IVA' })
  @IsOptional()
  @IsBoolean()
  ivaAfecto?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (ISO)' })
  @IsOptional()
  @IsString()
  fechaVencim?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  xmlUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pdfUrl?: string;
}

export class RegisterPaymentDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsPositive()
  monto!: number;

  @ApiPropertyOptional({ example: 'Transferencia' })
  @IsOptional()
  @IsString()
  medio?: string;

  @ApiPropertyOptional({ description: 'Fecha del pago (ISO)' })
  @IsOptional()
  @IsString()
  fecha?: string;
}
