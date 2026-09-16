import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E del flujo operativo completo contra la BD real (prompt §44). Requiere:
 *   docker compose up -d  (o un Postgres local)  &&  db push/migrate  &&  db:seed
 *
 * Cubre:
 *  - Compra → Recepción → Stock (Fases 2-3)
 *  - Pedido → Picking → Preparado → Despacho → Ruta → EN_RUTA (Fases 2-4)
 *  - Regla §37: no cerrar picking con diferencias sin justificar
 */
describe('Flujo operativo (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let warehouseId: string;

  const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Agrogood.2026';

  const authGet = (path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  const authPost = (path: string, body?: unknown) =>
    request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body ?? {});

  async function stockOf(sku: string) {
    const res = await authGet('/api/inventory/stock?pageSize=100');
    const row = res.body.data.find(
      (r: { product: { sku: string } }) => r.product.sku === sku,
    );
    return row as {
      productId: string;
      cantidadFisica: string;
      cantidadReservada: string;
      disponible: number;
      warehouse: { id: string };
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ companyRut: '76123456-7', email: 'admin@agrogood.cl', password: PASSWORD });
    token = login.body.accessToken;

    const salmon = await stockOf('SALMON');
    warehouseId = salmon.warehouse.id;
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('Compra → Recepción → Stock: recibir mercadería aumenta el stock físico', async () => {
    const before = await stockOf('SALMON');
    const antes = Number(before.cantidadFisica);

    const suppliers = await authGet('/api/suppliers?pageSize=10');
    const supplierId = suppliers.body.data[0].id;

    const oc = await authPost('/api/purchase-orders', {
      supplierId,
      warehouseId,
      items: [{ productId: before.productId, cantidad: 30, precioUnitario: 9000 }],
    });
    expect(oc.status).toBe(201);
    expect(oc.body.estado).toBe('BORRADOR');
    const ocItemId = oc.body.items[0].id;

    const approve = await authPost(`/api/purchase-orders/${oc.body.id}/approve`);
    expect(approve.status).toBe(201);
    expect(approve.body.estado).toBe('APROBADA');

    const receive = await authPost(`/api/purchase-orders/${oc.body.id}/receive`, {
      items: [{ purchaseOrderItemId: ocItemId, productId: before.productId, cantidad: 30 }],
    });
    expect(receive.status).toBe(201);

    const after = await stockOf('SALMON');
    expect(Number(after.cantidadFisica)).toBe(antes + 30);
  });

  it('Pedido → Picking → Preparado → Despacho → Ruta despacha stock y pasa a EN_RUTA', async () => {
    const tomateBefore = await stockOf('TOMATE');
    const fisicaAntes = Number(tomateBefore.cantidadFisica);
    const reservadaAntes = Number(tomateBefore.cantidadReservada);

    const customers = await authGet('/api/customers?pageSize=10');
    const customerId = customers.body.data[0].id;

    // 1) Pedido con stock disponible → CONFIRMADO y reservado.
    const order = await authPost('/api/sales-orders', {
      customerId,
      items: [{ productId: tomateBefore.productId, cantidad: 20 }],
    });
    expect(order.status).toBe(201);
    expect(order.body.estado).toBe('CONFIRMADO');
    const orderId = order.body.id;

    const tomateReservado = await stockOf('TOMATE');
    expect(Number(tomateReservado.cantidadReservada)).toBe(reservadaAntes + 20);

    // 2) Picking → EN_PICKING.
    const picking = await authPost('/api/pickings', { salesOrderId: orderId });
    expect(picking.status).toBe(201);
    const pickingId = picking.body.id;
    const itemId = picking.body.items[0].id;

    const afterCreate = await authGet(`/api/sales-orders/${orderId}`);
    expect(afterCreate.body.estado).toBe('EN_PICKING');

    // 3) Iniciar, pickear completo y cerrar → PREPARADO.
    await authPost(`/api/pickings/${pickingId}/start`).expect(201);
    await authPost(`/api/pickings/${pickingId}/items/${itemId}`, {
      cantidadPickeada: 20,
      estado: 'OK',
    }).expect(201);
    const finalize = await authPost(`/api/pickings/${pickingId}/finalize`);
    expect(finalize.status).toBe(201);
    expect(finalize.body.estado).toBe('COMPLETADO');

    const prepared = await authGet(`/api/sales-orders/${orderId}`);
    expect(prepared.body.estado).toBe('PREPARADO');

    // 4) Despacho: el pedido aparece como rutable.
    const dispatchable = await authGet('/api/routes/dispatchable?pageSize=50');
    expect(
      dispatchable.body.data.some((o: { id: string }) => o.id === orderId),
    ).toBe(true);

    // 5) Crear ruta, asignar vehículo/conductor, cargar y salir.
    const vehicles = await authGet('/api/vehicles?pageSize=10');
    const drivers = await authGet('/api/drivers?pageSize=10');
    const route = await authPost('/api/routes', { salesOrderIds: [orderId] });
    expect(route.status).toBe(201);
    const routeId = route.body.id;

    await authPost(`/api/routes/${routeId}/assign`, {
      vehicleId: vehicles.body.data[0].id,
      driverId: drivers.body.data[0].id,
    }).expect(201);
    await authPost(`/api/routes/${routeId}/transition`, { to: 'CARGANDO' }).expect(201);

    const depart = await authPost(`/api/routes/${routeId}/depart`);
    expect(depart.status).toBe(201);
    expect(depart.body.estado).toBe('EN_RUTA');

    // El pedido quedó EN_RUTA y el stock físico bajó 20.
    const routed = await authGet(`/api/sales-orders/${orderId}`);
    expect(routed.body.estado).toBe('EN_RUTA');

    const tomateAfter = await stockOf('TOMATE');
    expect(Number(tomateAfter.cantidadFisica)).toBe(fisicaAntes - 20);

    // Se registró el movimiento DESPACHO en el libro mayor.
    const movs = await authGet(
      `/api/inventory/movements?productId=${tomateBefore.productId}&pageSize=20`,
    );
    expect(
      movs.body.data.some((m: { tipo: string }) => m.tipo === 'DESPACHO'),
    ).toBe(true);
  }, 60_000);

  it('Regla §37: no se puede cerrar el picking con diferencias sin justificar', async () => {
    const tomate = await stockOf('TOMATE');
    const customers = await authGet('/api/customers?pageSize=10');
    const customerId = customers.body.data[0].id;

    const order = await authPost('/api/sales-orders', {
      customerId,
      items: [{ productId: tomate.productId, cantidad: 10 }],
    });
    const orderId = order.body.id;

    const picking = await authPost('/api/pickings', { salesOrderId: orderId });
    const pickingId = picking.body.id;
    const itemId = picking.body.items[0].id;

    await authPost(`/api/pickings/${pickingId}/start`).expect(201);
    // Pickea menos de lo solicitado SIN justificar.
    await authPost(`/api/pickings/${pickingId}/items/${itemId}`, {
      cantidadPickeada: 6,
      estado: 'OK',
    }).expect(201);

    // Cierre debe fallar (400) por diferencia sin justificar.
    await authPost(`/api/pickings/${pickingId}/finalize`).expect(400);

    // Con justificación, el cierre procede (INCOMPLETO por la diferencia).
    await authPost(`/api/pickings/${pickingId}/items/${itemId}`, {
      cantidadPickeada: 6,
      estado: 'OK',
      observacion: 'Solo quedaban 6 kg en cámara',
    }).expect(201);
    const ok = await authPost(`/api/pickings/${pickingId}/finalize`);
    expect(ok.status).toBe(201);
    expect(ok.body.estado).toBe('INCOMPLETO');

    const incompleto = await authGet(`/api/sales-orders/${orderId}`);
    expect(incompleto.body.estado).toBe('PICKING_INCOMPLETO');
  }, 60_000);
});
