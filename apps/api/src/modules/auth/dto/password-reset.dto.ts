import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: '76123456-7' })
  @IsString()
  @Length(1, 20)
  companyRut!: string;

  @ApiProperty({ example: 'admin@agrogood.cl' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por el usuario' })
  @IsString()
  @Length(10, 200)
  token!: string;

  @ApiProperty({ example: 'NuevaClave.2026', minLength: 10 })
  @IsString()
  @Length(10, 128)
  newPassword!: string;
}
