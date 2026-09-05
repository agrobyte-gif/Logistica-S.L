/**
 * Seed de datos demo (prompt §45): empresa, bodegas, permisos, roles y un
 * usuario por rol. Idempotente: se puede correr varias veces (upsert).
 *
 * Contraseña común de los usuarios demo: variable SEED_DEMO_PASSWORD.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  DEFAULT_ROLE_PERMISSIONS,
  Permission,
  RoleName,
} from '@agrogood/shared';

const prisma = new PrismaClient();

const COMPANY_RUT = '76123456-7';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Agrogood.2026';

/** Email demo por rol. */
const ROLE_USERS: Record<RoleName, { nombre: string; email: string }> = {
  [RoleName.ADMINISTRADOR]: { nombre: 'Admin Demo', email: 'admin@agrogood.cl' },
  [RoleName.GERENTE]: { nombre: 'Gerente Demo', email: 'gerente@agrogood.cl' },
  [RoleName.JEFE_OPERACIONES]: {
    nombre: 'Jefe Operaciones Demo',
    email: 'operaciones@agrogood.cl',
  },
  [RoleName.ENCARGADO_COMPRAS]: {
    nombre: 'Encargado Compras Demo',
    email: 'compras@agrogood.cl',
  },
  [RoleName.BODEGUERO]: { nombre: 'Bodeguero Demo', email: 'bodega@agrogood.cl' },
  [RoleName.PICKER]: { nombre: 'Picker Demo', email: 'picker@agrogood.cl' },
  [RoleName.DESPACHADOR]: {
    nombre: 'Despachador Demo',
    email: 'despacho@agrogood.cl',
  },
  [RoleName.CONDUCTOR]: { nombre: 'Conductor Demo', email: 'conductor@agrogood.cl' },
  [RoleName.ADMINISTRACION]: {
    nombre: 'Administración Demo',
    email: 'administracion@agrogood.cl',
  },
};

async function main(): Promise<void> {
  console.log('Sembrando datos demo…');

  // 1) Permisos (todas las claves del enum).
  const permissionRecords = new Map<string, string>();
  for (const clave of Object.values(Permission)) {
    const perm = await prisma.permission.upsert({
      where: { clave },
      update: {},
      create: { clave },
    });
    permissionRecords.set(clave, perm.id);
  }

  // 2) Empresa demo.
  const company = await prisma.company.upsert({
    where: { rut: COMPANY_RUT },
    update: {},
    create: {
      rut: COMPANY_RUT,
      razonSocial: 'AGROGOOD Distribución SpA',
      nombreComercial: 'AGROGOOD',
      giro: 'Distribución de alimentos',
      direccion: 'Santiago, Chile',
    },
  });

  // 3) Bodegas demo.
  const bodegaCentral = await prisma.warehouse.upsert({
    where: { id: `${company.id}-central` },
    update: {},
    create: {
      id: `${company.id}-central`,
      companyId: company.id,
      nombre: 'Bodega Central',
      tipo: 'PRINCIPAL',
      direccion: 'Santiago, Chile',
    },
  });
  for (const loc of ['CAMARA-REFRIG', 'SECOS', 'CONGELADOS', 'ZONA-DESPACHO']) {
    await prisma.warehouseLocation.upsert({
      where: {
        warehouseId_codigo: { warehouseId: bodegaCentral.id, codigo: loc },
      },
      update: {},
      create: {
        warehouseId: bodegaCentral.id,
        codigo: loc,
        tipo: 'ZONA',
      },
    });
  }

  // 4) Roles con sus permisos.
  const roleRecords = new Map<RoleName, string>();
  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: {
        companyId_nombre: { companyId: company.id, nombre: roleName },
      },
      update: {},
      create: {
        companyId: company.id,
        nombre: roleName,
        descripcion: `Rol ${roleName}`,
      },
    });
    roleRecords.set(roleName, role.id);

    // Reasigna permisos por defecto de forma idempotente.
    const perms = DEFAULT_ROLE_PERMISSIONS[roleName];
    for (const clave of perms) {
      const permissionId = permissionRecords.get(clave);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  // 5) Un usuario por rol.
  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
  });

  for (const roleName of Object.values(RoleName)) {
    const info = ROLE_USERS[roleName];
    const user = await prisma.user.upsert({
      where: {
        companyId_email: { companyId: company.id, email: info.email },
      },
      update: {},
      create: {
        companyId: company.id,
        nombre: info.nombre,
        email: info.email,
        passwordHash,
      },
    });

    const roleId = roleRecords.get(roleName)!;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });

    // Acceso a la bodega central para roles operativos.
    await prisma.userWarehouse.upsert({
      where: {
        userId_warehouseId: {
          userId: user.id,
          warehouseId: bodegaCentral.id,
        },
      },
      update: {},
      create: { userId: user.id, warehouseId: bodegaCentral.id },
    });
  }

  console.log('✔ Datos demo listos.');
  console.log(`  Empresa RUT: ${COMPANY_RUT}`);
  console.log(`  Usuarios: ${Object.values(ROLE_USERS).map((u) => u.email).join(', ')}`);
  console.log(`  Contraseña demo: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
