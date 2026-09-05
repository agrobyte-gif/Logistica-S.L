import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E de autenticación y RBAC. Requiere la base de datos levantada y sembrada:
 *   docker compose up -d && npm run db:migrate && npm run db:seed
 * Prueba el flujo: login → acceso protegido → 401 sin token.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health es público y responde ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });

  it('GET /api/dashboard/summary sin token → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .expect(401);
  });

  it('login con credenciales válidas devuelve accessToken y usuario', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        companyRut: '76123456-7',
        email: 'admin@agrogood.cl',
        password: process.env.SEED_DEMO_PASSWORD ?? 'Agrogood.2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.roles).toContain('ADMINISTRADOR');

    // El access token permite acceder a una ruta protegida.
    const me = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('admin@agrogood.cl');
  });

  it('login con contraseña incorrecta → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        companyRut: '76123456-7',
        email: 'admin@agrogood.cl',
        password: 'clave-incorrecta',
      })
      .expect(401);
  });
});
