import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: '77888999-0' })
  @IsString()
  @Length(1, 20)
  rut!: string;

  @ApiProperty({ example: 'Sushi Sakura SpA' })
  @IsString()
  @Length(1, 200)
  razonSocial!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombreComercial?: string;

  @ApiPropertyOptional({ example: 'RESTAURANT' })
  @IsOptional()
  @IsString()
  tipoCliente?: string;

  @ApiPropertyOptional({ example: '30 días' })
  @IsOptional()
  @IsString()
  condicionPago?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  creditoHabilitado?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  limiteCredito?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceListId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendedorId?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
