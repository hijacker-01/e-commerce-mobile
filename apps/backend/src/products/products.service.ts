import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { CreateProductDto, ProductQueryDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {}

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        shopId: dto.shopId,
        categoryId: dto.categoryId,
        brand: dto.brand,
        model: dto.model,
        title: dto.title,
        description: dto.description,
        specs: (dto.specs ?? {}) as Prisma.InputJsonValue,
        price: new Prisma.Decimal(dto.price),
        mrp: dto.mrp != null ? new Prisma.Decimal(dto.mrp) : undefined,
        lowestPrice: new Prisma.Decimal(dto.price),
        stockistPrice:
          dto.stockistPrice != null
            ? new Prisma.Decimal(dto.stockistPrice)
            : undefined,
        hsnCode: dto.hsnCode,
        gstRate: dto.gstRate != null ? new Prisma.Decimal(dto.gstRate) : undefined,
        condition: dto.condition,
        media: dto.media ?? [],
        videoLinks: dto.videoLinks ?? [],
      },
    });
    // Best-effort index into the search engine.
    await this.search.indexProduct(product);
    return product;
  }

  /** Lightweight lookups for the storefront filters & owner product form. */
  /** Owner toggles merchandising flags (e.g. "New arrival"). */
  setFlags(id: string, flags: { isNew?: boolean }) {
    return this.prisma.product.update({
      where: { id },
      data: { isNew: flags.isNew },
      select: { id: true, isNew: true },
    });
  }

  /** Staff-only: every product with its EXACT live stock count. */
  async listStock() {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ brand: 'asc' }, { title: 'asc' }],
      include: {
        inventory: { select: { quantity: true, reorderLevel: true } },
        category: { select: { name: true } },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      brand: p.brand,
      model: p.model,
      media: p.media,
      category: p.category?.name ?? null,
      price: p.price.toString(),
      quantity: p.inventory?.quantity ?? 0,
      reorderLevel: p.inventory?.reorderLevel ?? 2,
    }));
  }

  /** Staff-only: set the exact stock count for one product. */
  async setStock(productId: string, quantity: number, reorderLevel?: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    const qty = Math.max(0, Math.floor(quantity));
    const inv = await this.prisma.inventory.upsert({
      where: { productId },
      create: {
        productId,
        quantity: qty,
        reorderLevel: reorderLevel ?? 2,
      },
      update: {
        quantity: qty,
        ...(reorderLevel != null ? { reorderLevel } : {}),
      },
      select: { quantity: true, reorderLevel: true },
    });
    return { id: productId, ...inv };
  }

  listCategories() {
    return this.prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  listShops() {
    return this.prisma.shop.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Available filter values for the smart filter menu. Scoped to a category
   * when given, so the dropdowns only show options relevant to what's shown.
   */
  async facets(categoryId?: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, ...(categoryId ? { categoryId } : {}) },
      select: { brand: true, price: true, specs: true },
    });
    const brands = new Set<string>();
    const processors = new Set<string>();
    const ram = new Set<string>();
    const storage = new Set<string>();
    const camera = new Set<string>();
    let priceMin = Infinity;
    let priceMax = 0;
    for (const p of products) {
      brands.add(p.brand);
      const s = (p.specs ?? {}) as Record<string, unknown>;
      if (s.processor) processors.add(String(s.processor));
      if (s.ram) ram.add(String(s.ram));
      if (s.storage) storage.add(String(s.storage));
      if (s.camera) camera.add(String(s.camera));
      const price = Number(p.price);
      priceMin = Math.min(priceMin, price);
      priceMax = Math.max(priceMax, price);
    }
    const sort = (set: Set<string>) => [...set].sort();
    return {
      brands: sort(brands),
      processors: sort(processors),
      ram: sort(ram),
      storage: sort(storage),
      camera: sort(camera),
      priceMin: Number.isFinite(priceMin) ? priceMin : 0,
      priceMax,
    };
  }

  /**
   * Self-learning suggestions for the "Add product" form. Everything is
   * derived from products already in the catalogue, so each new brand / model
   * / spec the owner types is automatically available next time. Also returns
   * a template per brand+model so a known device auto-fills its details.
   */
  async catalogSuggest() {
    const products = await this.prisma.product.findMany({
      select: {
        brand: true,
        model: true,
        title: true,
        description: true,
        price: true,
        mrp: true,
        specs: true,
        categoryId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const brands = new Set<string>();
    const modelsByBrand: Record<string, Set<string>> = {};
    const processors = new Set<string>();
    const ram = new Set<string>();
    const storage = new Set<string>();
    const camera = new Set<string>();
    // Latest product per brand|model becomes the auto-fill template.
    const templates: Record<
      string,
      {
        brand: string;
        model: string;
        title: string;
        description: string | null;
        price: number;
        mrp: number | null;
        categoryId: string;
        specs: Record<string, unknown>;
      }
    > = {};

    for (const p of products) {
      if (p.brand) brands.add(p.brand);
      if (p.brand && p.model) {
        (modelsByBrand[p.brand] ??= new Set<string>()).add(p.model);
      }
      const s = (p.specs ?? {}) as Record<string, unknown>;
      if (s.processor) processors.add(String(s.processor));
      if (s.ram) ram.add(String(s.ram));
      if (s.storage) storage.add(String(s.storage));
      if (s.camera) camera.add(String(s.camera));

      const key = `${p.brand}|${p.model}`.toLowerCase();
      if (p.brand && p.model && !templates[key]) {
        templates[key] = {
          brand: p.brand,
          model: p.model,
          title: p.title,
          description: p.description,
          price: Number(p.price),
          mrp: p.mrp != null ? Number(p.mrp) : null,
          categoryId: p.categoryId,
          specs: s,
        };
      }
    }

    const sort = (set: Set<string>) => [...set].sort();
    const modelsOut: Record<string, string[]> = {};
    for (const b of Object.keys(modelsByBrand)) modelsOut[b] = sort(modelsByBrand[b]);

    return {
      brands: sort(brands),
      modelsByBrand: modelsOut,
      processors: sort(processors),
      ram: sort(ram),
      storage: sort(storage),
      camera: sort(camera),
      templates: Object.values(templates),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        inventory: { select: { quantity: true } },
        category: true,
        reviews: true,
        // Shop area/location shown as plain text (no map).
        shop: {
          select: { name: true, address: true, hours: true, phone: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Sibling variants (same storage/colour family) for the variant selector.
    let variants: Array<{
      id: string;
      variantLabel: string | null;
      price: Prisma.Decimal;
      inventory: { quantity: number } | null;
    }> = [];
    if (product.variantGroup) {
      variants = await this.prisma.product.findMany({
        where: { variantGroup: product.variantGroup, isActive: true },
        select: {
          id: true,
          variantLabel: true,
          price: true,
          inventory: { select: { quantity: true } },
        },
        orderBy: { price: 'asc' },
      });
    }
    // Expose availability only — not the live stock count.
    const { inventory, ...rest } = product;
    return {
      ...rest,
      inStock: (inventory?.quantity ?? 0) > 0,
      variants: variants.map(({ inventory: inv, ...v }) => ({
        ...v,
        inStock: (inv?.quantity ?? 0) > 0,
      })),
    };
  }

  // ---- Product Q&A ----
  listQuestions(productId: string) {
    return this.prisma.productQuestion.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Staff inbox: all questions (optionally only unanswered) across products. */
  listAllQuestions(unansweredOnly = false) {
    return this.prisma.productQuestion.findMany({
      where: unansweredOnly ? { answer: null } : {},
      include: {
        user: { select: { name: true } },
        product: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  askQuestion(userId: string, productId: string, question: string) {
    return this.prisma.productQuestion.create({
      data: { userId, productId, question },
    });
  }

  answerQuestion(questionId: string, answer: string, answeredBy: string) {
    return this.prisma.productQuestion.update({
      where: { id: questionId },
      data: { answer, answeredBy, answeredAt: new Date() },
    });
  }

  /** Faceted listing for the smart-filter storefront. */
  list(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.activeOnly !== false) where.isActive = true;
    if (query.brand) where.brand = query.brand;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = {};
      if (query.minPrice != null) where.price.gte = new Prisma.Decimal(query.minPrice);
      if (query.maxPrice != null) where.price.lte = new Prisma.Decimal(query.maxPrice);
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { brand: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    // Spec facet filters live inside the JSON `specs` column.
    const specFilters: Prisma.ProductWhereInput[] = [];
    if (query.processor)
      specFilters.push({ specs: { path: ['processor'], equals: query.processor } });
    if (query.ram)
      specFilters.push({ specs: { path: ['ram'], equals: query.ram } });
    if (query.storage)
      specFilters.push({ specs: { path: ['storage'], equals: query.storage } });
    if (query.camera)
      specFilters.push({ specs: { path: ['camera'], equals: query.camera } });
    if (specFilters.length) where.AND = specFilters;

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    const rows = await this.prisma.product.findMany({
      where,
      orderBy,
      include: {
        inventory: { select: { quantity: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    // Never expose the live stock count to the storefront (customers/stockists);
    // only whether the item is available.
    return rows.map(({ inventory, ...p }) => ({
      ...p,
      inStock: (inventory?.quantity ?? 0) > 0,
    }));
  }
}
