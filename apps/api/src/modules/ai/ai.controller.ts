import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('purchase-recommendations')
  @RequirePermissions(Permission.AI_VIEW)
  @ApiOperation({ summary: 'Recomendaciones de compra (estimación de demanda)' })
  @ApiQuery({ name: 'horizonDays', required: false })
  recommendations(
    @CurrentUser() user: AuthUser,
    @Query('horizonDays') horizonDays?: string,
  ) {
    return this.ai.purchaseRecommendations(
      user.companyId,
      horizonDays ? parseInt(horizonDays, 10) : undefined,
    );
  }

  @Get('anomalies')
  @RequirePermissions(Permission.AI_VIEW)
  @ApiOperation({ summary: 'Detección de anomalías (merma)' })
  anomalies(@CurrentUser() user: AuthUser) {
    return this.ai.anomalies(user.companyId);
  }

  @Get('customer-insights')
  @RequirePermissions(Permission.AI_VIEW)
  @ApiOperation({ summary: 'Análisis de clientes (frecuencia, ticket)' })
  customerInsights(@CurrentUser() user: AuthUser) {
    return this.ai.customerInsights(user.companyId);
  }
}
