import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'KPIs del dashboard gerencial (datos reales)' })
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(user.companyId);
  }

  @Get('control-tower')
  @RequirePermissions(Permission.CONTROL_TOWER_VIEW)
  @ApiOperation({ summary: 'Control Tower: operación en vivo + alertas' })
  controlTower(@CurrentUser() user: AuthUser) {
    return this.dashboard.controlTower(user.companyId);
  }
}
