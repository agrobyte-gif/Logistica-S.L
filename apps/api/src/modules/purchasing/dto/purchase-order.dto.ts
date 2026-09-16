import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PurchaseOrderStatus } from '@agrogood/shared';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** Filtros de listado de órdenes de compra. */
export class PurchaseOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  estado?: PurchaseOrderStatus;
}

export class PurchaseOrderItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ example: 4800 })
  @IsNumber()
  @Min(0)
  precioUnitario!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  supplierId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Necesidades de compra que satisface esta OC',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  purchaseRequestIds?: string[];
}

export class ReceiptItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchaseOrderItemId?: string;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lote?: string;
}

export class CreateReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ type: [ReceiptItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items!: ReceiptItemDto[];
}
