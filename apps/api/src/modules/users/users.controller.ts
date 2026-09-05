import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado (roles y permisos)' })
  async me(@CurrentUser() user: AuthUser) {
    const full = await this.users.findByIdWithAccess(user.userId);
    return {
      id: user.userId,
      companyId: user.companyId,
      nombre: full?.nombre,
      email: full?.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}
