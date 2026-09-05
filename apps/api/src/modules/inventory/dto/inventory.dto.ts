import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';

export class AdjustInventoryDto {
  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({
    description: 'Delta con signo (+ suma, − resta) sobre el stock físico',
    example: -5,
  })
  @IsNumber()
  delta!: number;

  @ApiProperty({ example: 'Conteo físico' })
  @IsString()
  @Length(1, 200)
  motivo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lote?: string;
}

export class TransferInventoryDto {
  @ApiProperty()
  @IsString()
  origenWarehouseId!: string;

  @ApiProperty()
  @IsString()
  destinoWarehouseId!: string;

  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lote?: string;
}
