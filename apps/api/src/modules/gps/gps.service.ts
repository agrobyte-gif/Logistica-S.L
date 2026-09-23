import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from '../../common/realtime/realtime.service';
import { ReportGpsDto } from './dto/gps.dto';

@Injectable()
export class GpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Registra una posición reportada por la app del conductor. */
  async report(companyId: string, userId: string, dto: ReportGpsDto) {
    const route = await this.prisma.route.findFirst({
      where: { id: dto.routeId, companyId },
      select: { id: true, vehicleId: true, driverId: true, numero: true },
    });
    if (!route) throw new BadRequestException('Ruta no válida');

    const pos = await this.prisma.gpsPosition.create({
      data: {
        companyId,
        routeId: route.id,
        vehicleId: route.vehicleId,
        driverId: route.driverId,
        lat: dto.lat,
        lng: dto.lng,
        velocidad: dto.velocidad,
        estadoRuta: dto.estadoRuta,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      },
    });

    // Empuje en tiempo real a la empresa (mapa/Control Tower).
    this.realtime.emitToCompany(companyId, 'gps:update', {
      routeId: route.id,
      numero: route.numero,
      lat: Number(pos.lat),
      lng: Number(pos.lng),
      velocidad: pos.velocidad != null ? Number(pos.velocidad) : null,
      recordedAt: pos.recordedAt,
    });

    return pos;
  }

  /** Última posición conocida de cada ruta activa (para el mapa/Control Tower). */
  async latestByActiveRoutes(companyId: string) {
    // Una consulta por ruta en curso; el volumen de rutas activas es acotado.
    const rutas = await this.prisma.route.findMany({
      where: { companyId, estado: 'EN_RUTA' },
      select: { id: true, numero: true },
    });
    const result = [];
    for (const r of rutas) {
      const pos = await this.prisma.gpsPosition.findFirst({
        where: { routeId: r.id },
        orderBy: { recordedAt: 'desc' },
      });
      if (pos) result.push({ routeId: r.id, numero: r.numero, position: pos });
    }
    return result;
  }

  /** Traza (histórico) de una ruta. */
  async track(companyId: string, routeId: string) {
    return this.prisma.gpsPosition.findMany({
      where: { companyId, routeId },
      orderBy: { recordedAt: 'asc' },
      take: 1000,
    });
  }
}
