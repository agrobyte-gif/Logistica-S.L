import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ProductUnit } from '@agrogood/shared';

export class CreateProductDto {
  @ApiProperty({ example: 'PALTA-HASS' })
  @IsString()
  @Length(1, 60)
  sku!: string;

  @ApiProperty({ example: 'Palta Hass' })
  @IsString()
  @Length(1, 200)
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiProperty({ enum: ProductUnit, default: ProductUnit.KG })
  @IsEnum(ProductUnit)
  unidadBase!: ProductUnit;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ivaAfecto?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  puntoReposicion?: number;

  @ApiPropertyOptional({ description: 'Precio de venta inicial (lista por defecto)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVenta?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
