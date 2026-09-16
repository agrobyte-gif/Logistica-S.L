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
  ValidateNested,
} from 'class-validator';
import { DeliveryEvidenceType, DeliveryItemStatus } from '@agrogood/shared';

export class DeliveryItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsString()
  productNombre!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ enum: DeliveryItemStatus })
  @IsEnum(DeliveryItemStatus)
  status!: DeliveryItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivoRechazo?: string;
}

export class DeliveryEvidenceDto {
  @ApiProperty({ enum: DeliveryEvidenceType })
  @IsEnum(DeliveryEvidenceType)
  tipo!: DeliveryEvidenceType;

  @ApiProperty({ description: 'URL de la firma o foto (object storage)' })
  @IsString()
  url!: string;
}

export class RecordDeliveryDto {
  @ApiProperty()
  @IsString()
  routeStopId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receptorNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ type: [DeliveryItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemDto)
  items!: DeliveryItemDto[];

  @ApiPropertyOptional({ type: [DeliveryEvidenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryEvidenceDto)
  evidence?: DeliveryEvidenceDto[];
}
