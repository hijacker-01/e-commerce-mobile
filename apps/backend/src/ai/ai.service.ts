import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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

/**
 * AI engine backed by Groq's OpenAI-compatible API.
 * Structured results use JSON mode; everything degrades to 503 when
 * GROQ_API_KEY is unset.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly reasoningModel: string;
  private readonly fastModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const baseURL =
      this.config.get<string>('GROQ_BASE_URL') ??
      'https://api.groq.com/openai/v1';
    this.client = apiKey
      ? new OpenAI({ apiKey, baseURL, timeout: 20000, maxRetries: 1 })
      : null;
    this.reasoningModel =
      this.config.get<string>('GROQ_MODEL_REASONING') ??
      'llama-3.3-70b-versatile';
    this.fastModel =
      this.config.get<string>('GROQ_MODEL_FAST') ?? 'llama-3.1-8b-instant';
  }

  /** Smart, grounded comparison of 2–4 devices. */
  async compare(productIds: string[]) {
    const devices = await this.loadDevices(productIds);
    if (devices.length < 2) {
      throw new BadRequestException('Need at least 2 valid products to compare');
    }
    const prompt =
      'Compare these electronics devices for an Indian buyer. Ground every ' +
      'claim in the provided specs/benchmarks/real-world data — do not invent ' +
      'numbers. Respond with JSON of shape: { "summary": string, ' +
      '"winnerByCategory": { "performance": string, "battery": string, ' +
      '"audio": string, "value": string }, "bestFor": [{ "useCase": string, ' +
      '"productId": string }] }. Devices:\n' + JSON.stringify(devices, null, 2);
    return this.chatJson(prompt, 'device comparison', this.reasoningModel);
  }

  /** AI "perfect device recommender" over the live catalog. */
  async recommend(query: string, categoryId?: string) {
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    const candidates = await this.loadDevices(undefined, where);
    if (candidates.length === 0) {
      throw new BadRequestException('No products available to recommend from');
    }
    const prompt =
      `Customer need: "${query}".\n` +
      'Rank the best-matching devices from this catalog (most suitable first) ' +
      'and only recommend from the provided list. Respond with JSON of shape: ' +
      '{ "recommendations": [{ "productId": string, "reason": string, ' +
      '"confidence": "high"|"medium"|"low" }] }.\nCatalog:\n' +
      JSON.stringify(candidates, null, 2);
    return this.chatJson(prompt, 'device recommendation', this.reasoningModel);
  }

  /** Low-effort listing: draft a product from brand+model (model knowledge). */
  async draftListing(brand: string, model: string, categoryName?: string) {
    const prompt =
      `Draft a product listing for the electronics device "${brand} ${model}"` +
      (categoryName ? ` (category: ${categoryName})` : '') +
      ' for an Indian store, using your knowledge of the device. ' +
      'Respond with a JSON object with keys: title (string), description ' +
      '(string, 2-3 sentences), specs (object with processor, ram, storage, ' +
      'batteryMah, audioCodec, anc, btVersion, warrantyMonths where ' +
      'applicable), hsnCode (string), suggestedPriceMinInr (number), ' +
      'suggestedPriceMaxInr (number). Omit unknown fields rather than guessing.';
    const draft = await this.chatJson(prompt, 'draft listing', this.fastModel);
    return { draft, aiGenerated: true };
  }

  /** Summarize a product's reviews into pros/cons + sentiment. */
  async summarizeReviews(reviews: { rating: number; text: string | null }[]) {
    if (reviews.length === 0) return null;
    const prompt =
      'Summarize these product reviews. Respond with JSON of shape: ' +
      '{ "summary": string, "pros": string[], "cons": string[], ' +
      '"sentiment": "positive"|"neutral"|"negative" }. Reviews:\n' +
      JSON.stringify(reviews);
    return this.chatJson(prompt, 'review summary', this.fastModel);
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
      `${model}" in "${condition}" condition in India, using your knowledge ` +
      'of resale prices. Respond with JSON: ' +
      '{ "aiValueInr": number, "rationale": string }.';
    try {
      const parsed = (await this.chatJson(
        prompt,
        'exchange valuation',
        this.fastModel,
      )) as { aiValueInr?: number; rationale?: string } | null;
      return {
        aiValueInr:
          typeof parsed?.aiValueInr === 'number' ? parsed.aiValueInr : null,
        rationale: parsed?.rationale ?? '',
      };
    } catch {
      return null;
    }
  }

  /** Customer support chatbot grounded in the user's recent orders. */
  async support(userId: string, question: string): Promise<{ answer: string }> {
    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { number: true, status: true, total: true, paymentStatus: true },
    });
    const system =
      'You are a concise, friendly support agent for an Indian electronics ' +
      'store. Use the order context when relevant; for product-fit questions ' +
      'give practical guidance. Keep replies short.';
    // Never hard-fail: if the LLM is unavailable, fall back to a helpful,
    // order-aware canned answer so support always responds.
    try {
      const answer = await this.chatText(
        `My recent orders: ${JSON.stringify(orders)}\n\nQuestion: ${question}`,
        'support',
        this.fastModel,
        system,
      );
      if (answer && answer.trim()) return { answer };
    } catch (err) {
      this.logger.warn(`AI support unavailable, using fallback: ${err}`);
    }
    return { answer: this.supportFallback(question, orders) };
  }

  /** Deterministic helpdesk answer when the LLM can't be reached. */
  private supportFallback(
    question: string,
    orders: { number: string; status: string; total: unknown; paymentStatus: string }[],
  ): string {
    const q = question.toLowerCase();
    const latest = orders[0];
    if (/order|status|track|where|delivery|pickup|ready/.test(q)) {
      if (!latest) {
        return "You don't have any orders yet. Browse the shop and place one — full-price orders are usually ready for pickup in about 10 minutes (best windows 10 AM–12 PM and 8 PM–10 PM).";
      }
      return (
        `Your latest order ${latest.number} is currently "${latest.status}" ` +
        `(payment: ${latest.paymentStatus}). Pickup is from the store — ` +
        'full-price orders in ~10 minutes; coupon/card-discount orders the next ' +
        'day. Best pickup windows are 10 AM–12 PM and 8 PM–10 PM.'
      );
    }
    if (/return|refund|replace/.test(q)) {
      return 'You can request a return from My Orders once an order is Approved or Delivered — open the order and tap "Return". The shop reviews and approves it.';
    }
    if (/exchange|trade-in|trade in|buyback|old phone|old device/.test(q)) {
      return 'For an exchange, use the Exchange page to get an instant buyback estimate. Bring the original bill/invoice and your Aadhaar card to the store to complete it.';
    }
    if (/coupon|offer|discount|deal/.test(q)) {
      return 'Browse all codes on the Offers page, see the ones that fit your cart at checkout, or check the Special Store for our lowest deals. Paying by credit card gives an extra 5% off (up to ₹2,000).';
    }
    if (/pay|emi|upi|card|cod|cash/.test(q)) {
      return 'We accept UPI, Credit Card (5% off), Debit Card, Online/Netbanking, Cash on pickup, and No-cost EMI. Pick one at checkout.';
    }
    return 'I can help with your orders, store pickup, returns, exchange, offers and payments. For anything else, please call the store at 9000000001.';
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

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI engine not configured (set GROQ_API_KEY)',
      );
    }
    return this.client;
  }

  /** Chat completion returning parsed JSON (Groq JSON mode). */
  private async chatJson(
    prompt: string,
    label: string,
    model: string,
  ): Promise<unknown> {
    const client = this.ensureClient();
    try {
      const res = await client.chat.completions.create({
        model,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      });
      const content = res.choices[0]?.message?.content ?? '';
      return this.parseJson(content);
    } catch (err) {
      this.logger.error(`AI ${label} failed`, err as Error);
      throw new ServiceUnavailableException(`AI ${label} failed`);
    }
  }

  /** Chat completion returning plain text. */
  private async chatText(
    prompt: string,
    label: string,
    model: string,
    system?: string,
  ): Promise<string> {
    const client = this.ensureClient();
    try {
      const res = await client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages: [
          ...(system
            ? [{ role: 'system' as const, content: system }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
      });
      return res.choices[0]?.message?.content ?? '';
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
