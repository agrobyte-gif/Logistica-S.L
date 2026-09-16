import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { SequenceModule } from './common/sequence/sequence.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RbacGuard } from './common/auth/rbac.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WasteModule } from './modules/waste/waste.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { PickingModule } from './modules/picking/picking.module';
import { QualityModule } from './modules/quality/quality.module';
import { RoutingModule } from './modules/routing/routing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GpsModule } from './modules/gps/gps.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { CashModule } from './modules/cash/cash.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: (parseInt(process.env.THROTTLE_TTL ?? '60', 10)) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
      },
    ]),
    PrismaModule,
    AuditModule,
    SequenceModule,
    AuthModule,
    UsersModule,
    HealthModule,
    DashboardModule,
    CustomersModule,
    ProductsModule,
    SuppliersModule,
    SalesModule,
    PurchasingModule,
    InventoryModule,
    WasteModule,
    FleetModule,
    PickingModule,
    QualityModule,
    RoutingModule,
    NotificationsModule,
    GpsModule,
    DeliveriesModule,
    CashModule,
    InvoicingModule,
    FinanceModule,
  ],
  providers: [
    // Orden importante: rate limit → autenticación → autorización RBAC.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
  ],
})
export class AppModule {}
