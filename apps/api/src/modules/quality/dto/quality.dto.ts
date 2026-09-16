import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { QualityResult } from '@agrogood/shared';

export class CreateQualityCheckDto {
  @ApiProperty({ description: 'Pedido controlado' })
  @IsString()
  salesOrderId!: string;

  @ApiPropertyOptional({ description: 'Picking asociado (opcional)' })
  @IsOptional()
  @IsString()
  pickingId?: string;

  @ApiProperty({ enum: QualityResult })
  @IsEnum(QualityResult)
  resultado!: QualityResult;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  cantidadOk?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  calidadOk?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  embalajeOk?: boolean;

  @ApiPropertyOptional({ description: 'Cadena de frío OK (si aplica)' })
  @IsOptional()
  @IsBoolean()
  temperaturaOk?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
