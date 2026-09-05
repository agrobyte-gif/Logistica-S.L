import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateCategoryDto } from './dto/category.dto';

const DEFAULT_PRICE_LIST = 'General';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Productos ---

  async create(companyId: string, userId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { companyId, sku: dto.sku },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un producto con ese SKU');
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          companyId,
          sku: dto.sku,
          nombre: dto.nombre,
          codigoBarras: dto.codigoBarras,
          categoryId: dto.categoryId,
          marca: dto.marca,
          unidadBase: dto.unidadBase,
          ivaAfecto: dto.ivaAfecto ?? true,
          stockMinimo: dto.stockMinimo ?? 0,
          puntoReposicion: dto.puntoReposicion,
          createdById: userId,
        },
      });

      if (dto.precioVenta !== undefined) {
        const priceList = await this.ensureDefaultPriceList(tx, companyId);
        await tx.productPrice.create({
          data: {
            priceListId: priceList.id,
            productId: created.id,
            precioVenta: dto.precioVenta,
          },
        });
      }
      return created;
    });

    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Product',
      entityId: product.id,
      stateAfter: product,
    });
    return product;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const where: Prisma.ProductWhereInput = {
      companyId,
      ...(query.q
        ? {
            OR: [
              { nombre: { contains: query.q, mode: 'insensitive' } },
              { sku: { contains: query.q, mode: 'insensitive' } },
              { codigoBarras: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          category: { select: { id: true, nombre: true } },
          prices: {
            orderBy: { vigenteDesde: 'desc' },
            take: 1,
            select: { precioVenta: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    const data = rows.map(({ prices, ...p }) => ({
      ...p,
      precioVenta: prices[0]?.precioVenta ?? null,
    }));
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: {
        category: true,
        prices: { orderBy: { vigenteDesde: 'desc' }, take: 5 },
        inventory: true,
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateProductDto,
  ) {
    const before = await this.prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!before) throw new NotFoundException('Producto no encontrado');

    const updated = await this.prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          sku: dto.sku,
          nombre: dto.nombre,
          codigoBarras: dto.codigoBarras,
          categoryId: dto.categoryId,
          marca: dto.marca,
          unidadBase: dto.unidadBase,
          ivaAfecto: dto.ivaAfecto,
          stockMinimo: dto.stockMinimo,
          puntoReposicion: dto.puntoReposicion,
        },
      });
      // Cambiar precio = nuevo registro histórico (no se pisa el anterior).
      if (dto.precioVenta !== undefined) {
        const priceList = await this.ensureDefaultPriceList(tx, companyId);
        await tx.productPrice.create({
          data: {
            priceListId: priceList.id,
            productId: id,
            precioVenta: dto.precioVenta,
          },
        });
      }
      return prod;
    });

    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Product',
      entityId: id,
      stateBefore: before,
      stateAfter: updated,
    });
    return updated;
  }

  // --- Categorías ---

  listCategories(companyId: string) {
    return this.prisma.category.findMany({
      where: { companyId },
      orderBy: { nombre: 'asc' },
    });
  }

  createCategory(companyId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        companyId,
        nombre: dto.nombre,
        parentId: dto.parentId,
      },
    });
  }

  // --- Helpers ---

  private async ensureDefaultPriceList(
    tx: Prisma.TransactionClient,
    companyId: string,
  ) {
    const existing = await tx.priceList.findFirst({
      where: { companyId, nombre: DEFAULT_PRICE_LIST },
    });
    if (existing) return existing;
    return tx.priceList.create({
      data: { companyId, nombre: DEFAULT_PRICE_LIST, moneda: 'CLP' },
    });
  }
}
