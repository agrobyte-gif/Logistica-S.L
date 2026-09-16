import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReportGpsDto {
  @ApiProperty()
  @IsString()
  routeId!: string;

  @ApiProperty({ example: -33.4489 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -70.6693 })
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional({ description: 'km/h' })
  @IsOptional()
  @IsNumber()
  velocidad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estadoRuta?: string;

  @ApiPropertyOptional({ description: 'ISO; permite envío por lotes offline' })
  @IsOptional()
  @IsString()
  recordedAt?: string;
}
