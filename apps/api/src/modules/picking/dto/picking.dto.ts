import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PickingItemStatus, PickingStatus } from '@agrogood/shared';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** Filtros de listado de pickings. */
export class PickingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PickingStatus })
  @IsOptional()
  @IsEnum(PickingStatus)
  estado?: PickingStatus;

  @ApiPropertyOptional({ description: 'Filtrar por picker' })
  @IsOptional()
  @IsString()
  pickerId?: string;
}

export class CreatePickingDto {
  @ApiProperty({ description: 'Pedido a preparar' })
  @IsString()
  salesOrderId!: string;

  @ApiPropertyOptional({ description: 'Picker asignado (usuario)' })
  @IsOptional()
  @IsString()
  pickerId?: string;
}

export class AssignPickerDto {
  @ApiProperty({ description: 'Usuario picker' })
  @IsString()
  pickerId!: string;
}

export class UpdatePickingItemDto {
  @ApiProperty({ example: 12, description: 'Cantidad efectivamente pickeada' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidadPickeada!: number;

  @ApiProperty({ enum: PickingItemStatus })
  @IsEnum(PickingItemStatus)
  estado!: PickingItemStatus;

  @ApiPropertyOptional({ description: 'Producto sustituto (si estado=SUSTITUCION)' })
  @IsOptional()
  @IsString()
  productoSustitutoId?: string;

  @ApiPropertyOptional({ description: 'URL de la fotografía de evidencia' })
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @ApiPropertyOptional({
    description: 'Justificación (obligatoria si hay diferencia)',
  })
  @IsOptional()
  @IsString()
  observacion?: string;
}
