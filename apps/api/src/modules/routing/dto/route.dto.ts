import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { RouteStatus } from '@agrogood/shared';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** Filtros de listado de rutas. */
export class RouteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  estado?: RouteStatus;
}

export class CreateRouteDto {
  @ApiProperty({
    type: [String],
    description: 'Pedidos PREPARADOS a incluir como paradas (en orden)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  salesOrderIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}

export class AssignRouteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverId?: string;
}

export class AddStopDto {
  @ApiProperty()
  @IsString()
  salesOrderId!: string;
}

export class ReorderStopsDto {
  @ApiProperty({ type: [String], description: 'IDs de parada en el nuevo orden' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  stopIds!: string[];
}

export class TransitionRouteDto {
  @ApiProperty({
    enum: [RouteStatus.PLANIFICADA, RouteStatus.CARGANDO, RouteStatus.CANCELADA],
    description: 'Transición manual (la salida y el cierre tienen endpoint propio)',
  })
  @IsEnum(RouteStatus)
  @IsIn([RouteStatus.PLANIFICADA, RouteStatus.CARGANDO, RouteStatus.CANCELADA])
  to!: RouteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}
