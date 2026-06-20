import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const INDEX = 'products';

export interface SearchDoc {
  id: string;
  title: string;
  brand: string;
  model: string;
  description: string;
  price: number;
  condition: string;
  categoryId: string;
}

export interface SearchQuery {
  q?: string;
  brand?: string;
  maxPrice?: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch | null = null;
  private index: Index | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const host = this.config.get<string>('MEILI_HOST');
    if (host) {
      this.client = new MeiliSearch({
        host,
        apiKey: this.config.get<string>('MEILI_MASTER_KEY'),
      });
      this.index = this.client.index(INDEX);
    }
  }

  // Configure the index on boot; disable gracefully if Meili is unreachable.
  async onModuleInit() {
    if (!this.client || !this.index) return;
    try {
      const task = await this.index.updateSettings({
        filterableAttributes: ['brand', 'condition', 'categoryId', 'price'],
        searchableAttributes: ['title', 'brand', 'model', 'description'],
      });
      await this.client.waitForTask(task.taskUid);
    } catch (err) {
      this.logger.warn('Meilisearch unavailable — falling back to DB search');
      this.client = null;
      this.index = null;
    }
  }

  get enabled() {
    return !!this.index;
  }

  private toDoc(p: Product): SearchDoc {
    return {
      id: p.id,
      title: p.title,
      brand: p.brand,
      model: p.model,
      description: p.description ?? '',
      price: Number(p.price),
      condition: p.condition,
      categoryId: p.categoryId,
    };
  }

  /** Index/refresh a single product (best-effort). */
  async indexProduct(product: Product) {
    if (!this.index) return;
    try {
      await this.index.addDocuments([this.toDoc(product)], { primaryKey: 'id' });
    } catch (err) {
      this.logger.warn(`Failed to index product ${product.id}`);
    }
  }

  /** Backfill the whole catalog into Meilisearch. */
  async reindexAll(): Promise<{ indexed: number; engine: string }> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
    });
    if (!this.index || !this.client) {
      return { indexed: products.length, engine: 'db-fallback' };
    }
    const task = await this.index.addDocuments(
      products.map((p) => this.toDoc(p)),
      { primaryKey: 'id' },
    );
    await this.client.waitForTask(task.taskUid);
    return { indexed: products.length, engine: 'meilisearch' };
  }

  /** Faceted search via Meilisearch, with a Postgres fallback. */
  async search(query: SearchQuery) {
    if (this.index) {
      const filter: string[] = [];
      if (query.brand) filter.push(`brand = "${query.brand}"`);
      if (query.maxPrice != null) filter.push(`price <= ${query.maxPrice}`);
      const res = await this.index.search(query.q ?? '', { filter, limit: 50 });
      return { engine: 'meilisearch', hits: res.hits };
    }
    return { engine: 'db-fallback', hits: await this.dbSearch(query) };
  }

  private async dbSearch(query: SearchQuery) {
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (query.brand) where.brand = query.brand;
    if (query.maxPrice != null)
      where.price = { lte: new Prisma.Decimal(query.maxPrice) };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { brand: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const products = await this.prisma.product.findMany({ where, take: 50 });
    return products.map((p) => this.toDoc(p));
  }
}
