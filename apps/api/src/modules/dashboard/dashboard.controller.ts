import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Dashboard básico de Fase 1. Los KPIs reales (ventas, pedidos, stock, etc.,
 * prompt §27) se conectan a medida que existan sus módulos en fases siguientes.
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Resumen del dashboard (placeholder Fase 1)' })
  async summary(@CurrentUser() user: AuthUser) {
    const [usuarios, bodegas] = await Promise.all([
      this.prisma.user.count({ where: { companyId: user.companyId } }),
      this.prisma.warehouse.count({ where: { companyId: user.companyId } }),
    ]);

    return {
      companyId: user.companyId,
      kpis: {
        usuarios,
        bodegas,
        // KPIs pendientes de fases posteriores (se muestran como null en la UI):
        ventasHoy: null,
        pedidosHoy: null,
        pedidosPendientes: null,
        stockCritico: null,
      },
      fase: 1,
      nota: 'KPIs operativos disponibles conforme avancen las fases 2-7.',
    };
  }
}
