import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '76123456-7', description: 'RUT de la empresa' })
  @IsString()
  @Length(1, 20)
  companyRut!: string;

  @ApiProperty({ example: 'admin@agrogood.cl' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Agrogood.2026' })
  @IsString()
  @Length(1, 128)
  password!: string;

  @ApiProperty({
    required: false,
    description: 'Código TOTP de 6 dígitos si el usuario tiene 2FA activo',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totp?: string;
}
