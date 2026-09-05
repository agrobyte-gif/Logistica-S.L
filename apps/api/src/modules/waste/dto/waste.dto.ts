import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { WasteReason } from '@agrogood/shared';

export class CreateWasteDto {
  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ enum: WasteReason })
  @IsEnum(WasteReason)
  motivo!: WasteReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lote?: string;

  @ApiPropertyOptional({ description: 'Costo unitario para valorizar la merma' })
  @IsOptional()
  @IsNumber()
  costoUnitario?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  observacion?: string;
}
