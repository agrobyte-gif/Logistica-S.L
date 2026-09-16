import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Todo usuario autenticado ve sus propias notificaciones (sin permiso extra).
  @Get()
  @ApiOperation({ summary: 'Mis notificaciones' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.notifications.listMine(user.companyId, user.userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Conteo de no leídas' })
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.companyId, user.userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Marcar como leída' })
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.companyId, user.userId, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.companyId, user.userId);
  }
}
