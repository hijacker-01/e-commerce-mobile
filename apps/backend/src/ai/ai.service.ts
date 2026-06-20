import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Minimal device shape handed to the model for grounding.
interface DeviceContext {
  id: string;
  brand: string;
  model: string;
  title: string;
  price: string;
  specs: Record<string, unknown>;
  benchmarks?: Record<string, unknown>;
  groundPerf?: Record<string, unknown>;
  rating?: number | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;
  private readonly reasoningModel: string;
  private readonly fastModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    // Degrade gracefully when no key is configured (e.g. local dev).
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.reasoningModel =
      this.config.get<string>('AI_MODEL_REASONING') ?? 'claude-opus-4-8';
    this.fastModel =
      this.config.get<string>('AI_MODEL_FAST') ?? 'claude-haiku-4-5';
  }

  /** Smart, grounded comparison of 2–4 devices. */
  async compare(productIds: string[]) {
    const devices = await this.loadDevices(productIds);
    if (devices.length < 2) {
      throw new BadRequestException('Need at least 2 valid products to compare');
    }

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        winnerByCategory: {
          type: 'object',
          additionalProperties: false,
          properties: {
            performance: { type: 'string' },
            battery: { type: 'string' },
            audio: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['performance', 'battery', 'audio', 'value'],
        },
        bestFor: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              useCase: { type: 'string' },
              productId: { type: 'string' },
            },
            required: ['useCase', 'productId'],
          },
        },
      },
      required: ['summary', 'winnerByCategory', 'bestFor'],
    };

    const prompt =
      'Compare these electronics devices for an Indian buyer. Ground every ' +
      'claim in the provided specs/benchmarks/real-world data — do not invent ' +
      'numbers. Devices:\n' +
      JSON.stringify(devices, null, 2);

    return this.callJson(prompt, schema, 'device comparison');
  }

  /** AI "perfect device recommender" over the live catalog. */
  async recommend(query: string, categoryId?: string) {
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    const candidates = await this.loadDevices(undefined, where);
    if (candidates.length === 0) {
      throw new BadRequestException('No products available to recommend from');
    }

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              productId: { type: 'string' },
              reason: { type: 'string' },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['productId', 'reason', 'confidence'],
          },
        },
      },
      required: ['recommendations'],
    };

    const prompt =
      `Customer need: "${query}".\n` +
      'Rank the best-matching devices from this catalog (most suitable first). ' +
      'Justify each pick against the stated need and ground claims in the data. ' +
      'Only recommend from the provided list.\nCatalog:\n' +
      JSON.stringify(candidates, null, 2);

    return this.callJson(prompt, schema, 'device recommendation');
  }

  /**
   * Low-effort listing: research a device by brand+model (web search) and
   * return a draft the owner reviews before saving. Uses the cheap model.
   */
  async draftListing(brand: string, model: string, categoryName?: string) {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI engine not configured (set ANTHROPIC_API_KEY)',
      );
    }
    const prompt =
      `Research the electronics device "${brand} ${model}"` +
      (categoryName ? ` (category: ${categoryName})` : '') +
      ' using web search, then draft a product listing for an Indian store.\n' +
      'Output ONLY a JSON object (no prose, no code fences) with keys: ' +
      'title (string), description (string, 2-3 sentences), specs (object with ' +
      'processor, ram, storage, batteryMah, audioCodec, anc, btVersion, ' +
      'warrantyMonths where applicable), hsnCode (string), ' +
      'suggestedPriceMinInr (number), suggestedPriceMaxInr (number). ' +
      'Ground specs in search results; omit unknown fields rather than guessing.';

    try {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('\n');
      return { draft: this.parseJson(text), aiGenerated: true };
    } catch (err) {
      this.logger.error('AI draft listing failed', err as Error);
      throw new ServiceUnavailableException('AI draft listing failed');
    }
  }

  /** Summarize a product's reviews into pros/cons + sentiment. */
  async summarizeReviews(reviews: { rating: number; text: string | null }[]) {
    if (reviews.length === 0) return null;
    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        pros: { type: 'array', items: { type: 'string' } },
        cons: { type: 'array', items: { type: 'string' } },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
      },
      required: ['summary', 'pros', 'cons', 'sentiment'],
    };
    const prompt =
      'Summarize these product reviews into a one-line summary, pros, cons, ' +
      'and overall sentiment. Reviews:\n' +
      JSON.stringify(reviews);
    return this.callJson(prompt, schema, 'review summary', {
      model: this.fastModel,
      useThinking: false,
    });
  }

  /** Estimate a fair INR buyback/exchange value for a used device. */
  async estimateExchangeValue(
    brand: string,
    model: string,
    condition: string,
  ): Promise<{ aiValueInr: number | null; rationale: string } | null> {
    if (!this.client) return null;
    const prompt =
      `Estimate a fair exchange/buyback price in INR for a used "${brand} ` +
      `${model}" in "${condition}" condition in India. Use web search for ` +
      'current resale prices. Output ONLY JSON: ' +
      '{ "aiValueInr": number, "rationale": string }.';
    try {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('\n');
      const parsed = this.parseJson(text) as {
        aiValueInr?: number;
        rationale?: string;
      } | null;
      return {
        aiValueInr: typeof parsed?.aiValueInr === 'number' ? parsed.aiValueInr : null,
        rationale: parsed?.rationale ?? '',
      };
    } catch (err) {
      this.logger.error('AI exchange valuation failed', err as Error);
      return null;
    }
  }

  /** Customer support chatbot grounded in the user's recent orders. */
  async support(userId: string, question: string): Promise<{ answer: string }> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI engine not configured (set ANTHROPIC_API_KEY)',
      );
    }
    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { number: true, status: true, total: true, paymentStatus: true },
    });
    const system =
      'You are a concise, friendly support agent for an Indian electronics ' +
      'store. Answer using the customer order context when relevant; for ' +
      'product fit questions give practical guidance. Keep replies short.';
    try {
      const response = await this.client.messages.create({
        model: this.fastModel,
        max_tokens: 1024,
        system,
        messages: [
          {
            role: 'user',
            content:
              `My recent orders: ${JSON.stringify(orders)}\n\nQuestion: ${question}`,
          },
        ],
      });
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('\n');
      return { answer: text };
    } catch (err) {
      this.logger.error('AI support failed', err as Error);
      throw new ServiceUnavailableException('AI support failed');
    }
  }

  // --- helpers -------------------------------------------------------------

  private async loadDevices(
    ids?: string[],
    where?: Prisma.ProductWhereInput,
  ): Promise<DeviceContext[]> {
    const products = await this.prisma.product.findMany({
      where: ids ? { id: { in: ids } } : where,
      include: { deviceKb: true, reviews: { select: { rating: true } } },
      take: ids ? undefined : 25,
    });

    return products.map((p) => {
      const ratings = p.reviews.map((r) => r.rating);
      const avg =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;
      return {
        id: p.id,
        brand: p.brand,
        model: p.model,
        title: p.title,
        price: p.price.toString(),
        specs: (p.specs ?? {}) as Record<string, unknown>,
        benchmarks: (p.deviceKb?.benchmarks ?? undefined) as
          | Record<string, unknown>
          | undefined,
        groundPerf: (p.deviceKb?.groundPerf ?? undefined) as
          | Record<string, unknown>
          | undefined,
        rating: avg,
      };
    });
  }

  private async callJson(
    prompt: string,
    schema: Record<string, unknown>,
    label: string,
    opts: { model?: string; useThinking?: boolean } = {},
  ): Promise<unknown> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI engine not configured (set ANTHROPIC_API_KEY)',
      );
    }
    const useThinking = opts.useThinking ?? true;
    try {
      const response = await this.client.messages.create({
        model: opts.model ?? this.reasoningModel,
        max_tokens: 16000,
        // Adaptive thinking + effort are only sent for the reasoning model;
        // the fast model takes neither.
        ...(useThinking
          ? {
              thinking: { type: 'adaptive' as const },
              output_config: {
                effort: 'high' as const,
                format: { type: 'json_schema' as const, schema },
              },
            }
          : {
              output_config: {
                format: { type: 'json_schema' as const, schema },
              },
            }),
        messages: [{ role: 'user', content: prompt }],
      });
      // output_config.format guarantees the first text block is valid JSON.
      const text = response.content.find((b) => b.type === 'text');
      return text ? JSON.parse((text as { text: string }).text) : null;
    } catch (err) {
      this.logger.error(`AI ${label} failed`, err as Error);
      throw new ServiceUnavailableException(`AI ${label} failed`);
    }
  }

  /** Parse JSON that may be wrapped in markdown code fences. */
  private parseJson(text: string): unknown {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(raw.slice(start, end + 1));
  }
}
