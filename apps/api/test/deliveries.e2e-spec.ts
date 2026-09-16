import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * E2E del flujo de entrega (Fase 5). Requiere BD levantada y sembrada.
 * Prepara vía Prisma una ruta EN_RUTA con una parada, registra la entrega por
 * la API y verifica que el pedido pase a ENTREGADO y la ruta a COMPLETADA.
 * No toca el flow.e2e-spec.ts de la otra sesión.
 */
describe('Deliveries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let routeStopId: string;
  let salesOrderId: string;
  let routeId: string;

  const PASS = process.env.SEED_DEMO_PASSWORD ?? 'Agrogood.2026';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();

    prisma = app.get(PrismaService);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        companyRut: '76123456-7',
        email: 'admin@agrogood.cl',
        password: PASS,
      });
    token = login.body.accessToken;

    // Datos base sembrados.
    const company = await prisma.company.findFirstOrThrow({
      where: { rut: '76123456-7' },
    });
    const customer = await prisma.customer.findFirstOrThrow({
      where: { companyId: company.id },
    });
    const warehouse = await prisma.warehouse.findFirstOrThrow({
      where: { companyId: company.id },
    });
    const product = await prisma.product.findFirstOrThrow({
      where: { companyId: company.id },
    });

    const suffix = Date.now();

    const order = await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        numero: `PED-E2E-DEL-${suffix}`,
        customerId: customer.id,
        warehouseId: warehouse.id,
        estado: 'EN_RUTA',
        total: 1000,
        items: {
          create: [
            {
              productId: product.id,
              cantidad: 2,
              unidad: product.unidadBase,
              precioUnitario: 500,
              estadoStock: 'DISPONIBLE',
            },
          ],
        },
      },
    });
    salesOrderId = order.id;

    const route = await prisma.route.create({
      data: {
        companyId: company.id,
        numero: `RUT-E2E-DEL-${suffix}`,
        estado: 'EN_RUTA',
      },
    });
    routeId = route.id;

    const stop = await prisma.routeStop.create({
      data: {
        routeId: route.id,
        salesOrderId: order.id,
        orden: 1,
        estado: 'EN_RUTA',
      },
    });
    routeStopId = stop.id;
  });

  afterAll(async () => {
    // Limpieza best-effort de lo creado por esta prueba.
    await prisma.delivery.deleteMany({ where: { salesOrderId } });
    await prisma.routeStop.deleteMany({ where: { routeId } });
    await prisma.route.deleteMany({ where: { id: routeId } });
    await prisma.salesOrderItem.deleteMany({ where: { salesOrderId } });
    await prisma.salesOrder.deleteMany({ where: { id: salesOrderId } });
    await app.close();
  });

  it('registra la entrega y actualiza pedido y ruta', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        routeStopId,
        receptorNombre: 'Recepción Cliente',
        items: [
          {
            productId: (
              await prisma.salesOrderItem.findFirstOrThrow({
                where: { salesOrderId },
              })
            ).productId,
            productNombre: 'Producto e2e',
            cantidad: 2,
            status: 'ENTREGADO',
          },
        ],
        evidence: [{ tipo: 'FIRMA', url: 'https://example.test/firma.png' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('ENTREGADO');

    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: salesOrderId },
    });
    expect(order.estado).toBe('ENTREGADO');

    const route = await prisma.route.findUniqueOrThrow({
      where: { id: routeId },
    });
    expect(route.estado).toBe('COMPLETADA');
  });

  it('rechaza una parada inexistente con 404', async () => {
    await request(app.getHttpServer())
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        routeStopId: '00000000-0000-0000-0000-000000000000',
        items: [
          {
            productId: '00000000-0000-0000-0000-000000000000',
            productNombre: 'x',
            cantidad: 1,
            status: 'ENTREGADO',
          },
        ],
      })
      .expect(404);
  });
});
