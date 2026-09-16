import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { EntityStatus } from '@agrogood/shared';

export class CreateDriverDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @Length(1, 120)
  nombre!: string;

  @ApiPropertyOptional({ example: 'A-4', description: 'Clase de licencia' })
  @IsOptional()
  @IsString()
  licencia?: string;

  @ApiPropertyOptional({ example: '+56 9 1234 5678' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Usuario del sistema enlazado (app del conductor, Fase 5)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  estado?: EntityStatus;
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {}
