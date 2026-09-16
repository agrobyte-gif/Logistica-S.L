import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permission } from '@agrogood/shared';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/auth/decorators';
import { AuthUser } from '../../common/auth/auth.types';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Catálogo de reportes disponibles' })
  list() {
    return this.reports.listReports();
  }

  @Get(':key')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Ejecutar reporte (JSON o CSV con ?format=csv)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async run(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Res({ passthrough: true }) res: Response,
    @Query('format') format?: string,
  ) {
    const report = await this.reports.run(user.companyId, key);
    if (!report) throw new NotFoundException('Reporte no encontrado');

    if (format === 'csv') {
      const csv = this.reports.toCsv(report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${key}.csv"`,
      );
      return csv;
    }
    return report;
  }
}
