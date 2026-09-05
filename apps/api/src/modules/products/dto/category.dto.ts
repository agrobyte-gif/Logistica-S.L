import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Frutas' })
  @IsString()
  @Length(1, 100)
  nombre!: string;

  @ApiPropertyOptional({ description: 'Categoría padre (subcategoría)' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
