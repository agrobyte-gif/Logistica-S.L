import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { VehicleStatus } from '@agrogood/shared';

export class CreateVehicleDto {
  @ApiProperty({ example: 'GJKL-45' })
  @IsString()
  @Length(1, 20)
  patente!: string;

  @ApiPropertyOptional({ example: 'Camión refrigerado' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 'Mercedes-Benz' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 3500, description: 'Capacidad en kg' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  capacidadKg?: number;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  estado?: VehicleStatus;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
