import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { GpsService } from './gps.service';
import { ReportGpsDto } from './dto/gps.dto';

@ApiTags('gps')
@ApiBearerAuth()
@Controller('gps')
export class GpsController {
  constructor(private readonly gps: GpsService) {}

  @Post('report')
  @RequirePermissions(Permission.GPS_REPORT)
  @ApiOperation({ summary: 'Reportar posición GPS (app del conductor)' })
  report(@CurrentUser() user: AuthUser, @Body() dto: ReportGpsDto) {
    return this.gps.report(user.companyId, user.userId, dto);
  }

  @Get('latest')
  @RequirePermissions(Permission.GPS_READ)
  @ApiOperation({ summary: 'Última posición de las rutas en curso' })
  latest(@CurrentUser() user: AuthUser) {
    return this.gps.latestByActiveRoutes(user.companyId);
  }

  @Get('track/:routeId')
  @RequirePermissions(Permission.GPS_READ)
  @ApiOperation({ summary: 'Traza histórica de una ruta' })
  track(@CurrentUser() user: AuthUser, @Param('routeId') routeId: string) {
    return this.gps.track(user.companyId, routeId);
  }
}
