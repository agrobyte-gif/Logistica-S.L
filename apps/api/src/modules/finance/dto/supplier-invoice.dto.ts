import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateSupplierInvoiceDto {
  @ApiProperty()
  @IsString()
  supplierId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @ApiProperty({ example: '5567' })
  @IsString()
  @Length(1, 40)
  folio!: string;

  @ApiProperty({ example: 200000 })
  @IsNumber()
  @Min(0)
  neto!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ivaAfecto?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (ISO)' })
  @IsOptional()
  @IsString()
  fechaVencim?: string;
}

export class RegisterSupplierPaymentDto {
  @ApiProperty({ example: 100000 })
  @IsNumber()
  @IsPositive()
  monto!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medio?: string;

  @ApiPropertyOptional({ description: 'Fecha del pago (ISO)' })
  @IsOptional()
  @IsString()
  fecha?: string;
}
