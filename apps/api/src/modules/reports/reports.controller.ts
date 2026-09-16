import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
  StreamableFile,
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
  @ApiOperation({ summary: 'Ejecutar reporte (JSON, CSV, XLSX o PDF)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv', 'xlsx', 'pdf'] })
  async run(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
    @Res({ passthrough: true }) res: Response,
    @Query('format') format?: string,
  ) {
    const report = await this.reports.run(user.companyId, key);
    if (!report) throw new NotFoundException('Reporte no encontrado');

    const titulo =
      this.reports.listReports().find((r) => r.key === key)?.label ?? key;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${key}.csv"`);
      return this.reports.toCsv(report);
    }
    if (format === 'xlsx') {
      const buf = await this.reports.toXlsx(report, titulo);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${key}.xlsx"`);
      return new StreamableFile(buf);
    }
    if (format === 'pdf') {
      const buf = await this.reports.toPdf(report, titulo);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${key}.pdf"`);
      return new StreamableFile(buf);
    }
    return report;
  }
}
