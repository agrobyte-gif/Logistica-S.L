import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: '90111222-3' })
  @IsString()
  @Length(1, 20)
  rut!: string;

  @ApiProperty({ example: 'Frutícola del Valle Ltda.' })
  @IsString()
  @Length(1, 200)
  razonSocial!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contacto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '30 días' })
  @IsOptional()
  @IsString()
  condicionPago?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
