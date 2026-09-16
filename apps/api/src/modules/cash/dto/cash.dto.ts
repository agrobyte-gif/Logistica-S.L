import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { CashMovementType } from '@agrogood/shared';

export class OpenCashDto {
  @ApiProperty({ example: 'Caja despacho' })
  @IsString()
  @Length(1, 100)
  nombre!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  saldoInicial?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsableId?: string;
}

export class CashMovementDto {
  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType)
  tipo!: CashMovementType;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @IsPositive()
  monto!: number;

  @ApiPropertyOptional({ example: 'Combustible' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comprobanteUrl?: string;
}
