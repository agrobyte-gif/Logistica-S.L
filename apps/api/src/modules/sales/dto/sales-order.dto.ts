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
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { SalesOrderStatus } from '@agrogood/shared';

export class SalesOrderItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: 60, description: 'Cantidad solicitada' })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiPropertyOptional({
    description: 'Precio unitario; si se omite se usa el precio vigente',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;
}

export class CreateSalesOrderDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerAddressId?: string;

  @ApiPropertyOptional({ description: 'Bodega; por defecto la principal' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [SalesOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items!: SalesOrderItemDto[];
}

export class TransitionOrderDto {
  @ApiProperty({ enum: SalesOrderStatus })
  @IsEnum(SalesOrderStatus)
  to!: SalesOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  motivo?: string;
}
