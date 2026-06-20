import { PrismaClient, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { phone: '9000000001' },
    update: {},
    create: {
      name: 'Shop Owner',
      phone: '9000000001',
      role: Role.OWNER,
      passwordHash,
    },
  });

  const shop = await prisma.shop.upsert({
    where: { ownerId: owner.id },
    update: {},
    create: {
      ownerId: owner.id,
      name: 'Bright Electronics',
      gstin: '27ABCDE1234F1Z5',
      address: 'MG Road, Pune',
      phone: '9000000001',
    },
  });

  async function category(name: string, slug: string) {
    return prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }

  const mobiles = await category('Mobile', 'mobile');
  const headphones = await category('Headphone', 'headphone');
  const laptops = await category('Laptop', 'laptop');
  const watches = await category('Smartwatch', 'smartwatch');
  const tablets = await category('Tablet', 'tablet');

  // Stable Unsplash CDN images (electronics product shots).
  const img = (id: string) =>
    `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

  const catalog: Array<{
    categoryId: string;
    brand: string;
    model: string;
    title: string;
    description: string;
    specs: Prisma.InputJsonValue;
    price: number;
    mrp: number;
    hsn: string;
    media: string[];
    quantity: number;
  }> = [
    {
      categoryId: mobiles.id,
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      title: 'Samsung Galaxy S24 Ultra 5G (12GB/256GB)',
      description:
        'Flagship Galaxy with titanium frame, 200MP camera and Galaxy AI.',
      specs: {
        processor: 'Snapdragon 8 Gen 3',
        ram: '12GB',
        storage: '256GB',
        display: '6.8" QHD+ AMOLED 120Hz',
        batteryMah: 5000,
        warrantyMonths: 12,
      },
      price: 124999,
      mrp: 134999,
      hsn: '8517',
      media: [img('1610945265064-0e34e5519bbf'), img('1511707171634-5f897ff02aa9')],
      quantity: 8,
    },
    {
      categoryId: mobiles.id,
      brand: 'Samsung',
      model: 'Galaxy A55',
      title: 'Samsung Galaxy A55 5G (8GB/128GB)',
      description: 'Mid-range 5G phone with a brilliant Super AMOLED display.',
      specs: {
        processor: 'Exynos 1480',
        ram: '8GB',
        storage: '128GB',
        batteryMah: 5000,
        btVersion: '5.3',
        warrantyMonths: 12,
      },
      price: 33999,
      mrp: 39999,
      hsn: '8517',
      media: [img('1511707171634-5f897ff02aa9')],
      quantity: 14,
    },
    {
      categoryId: headphones.id,
      brand: 'Sony',
      model: 'WH-1000XM5',
      title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
      description: 'Industry-leading ANC with 30-hour battery and crystal calls.',
      specs: {
        type: 'Over-ear',
        anc: true,
        btVersion: '5.2',
        batteryHours: 30,
        warrantyMonths: 12,
      },
      price: 26990,
      mrp: 34990,
      hsn: '8518',
      media: [img('1505740420928-5e560c06d30e')],
      quantity: 20,
    },
    {
      categoryId: headphones.id,
      brand: 'Samsung',
      model: 'Galaxy Buds3 Pro',
      title: 'Samsung Galaxy Buds3 Pro (ANC)',
      description: 'Hi-Fi earbuds with intelligent ANC and 360 audio.',
      specs: {
        type: 'In-ear',
        anc: true,
        btVersion: '5.4',
        batteryHours: 26,
        warrantyMonths: 12,
      },
      price: 19999,
      mrp: 22999,
      hsn: '8518',
      media: [img('1606220588913-b3aacb4d2f46')],
      quantity: 25,
    },
    {
      categoryId: laptops.id,
      brand: 'Samsung',
      model: 'Galaxy Book4 Pro',
      title: 'Samsung Galaxy Book4 Pro (16GB/512GB)',
      description: 'Ultra-thin AMOLED laptop with Intel Core Ultra performance.',
      specs: {
        processor: 'Intel Core Ultra 7',
        ram: '16GB',
        storage: '512GB SSD',
        display: '14" 3K AMOLED',
        warrantyMonths: 12,
      },
      price: 134990,
      mrp: 149990,
      hsn: '8471',
      media: [img('1496181133206-80ce9b88a853')],
      quantity: 6,
    },
    {
      categoryId: laptops.id,
      brand: 'Apple',
      model: 'MacBook Air M3',
      title: 'Apple MacBook Air 13" M3 (8GB/256GB)',
      description: 'Featherlight, silent, all-day battery with the M3 chip.',
      specs: {
        processor: 'Apple M3',
        ram: '8GB',
        storage: '256GB SSD',
        display: '13.6" Liquid Retina',
        warrantyMonths: 12,
      },
      price: 99900,
      mrp: 114900,
      hsn: '8471',
      media: [img('1517336714731-489689fd1ca8')],
      quantity: 9,
    },
    {
      categoryId: watches.id,
      brand: 'Samsung',
      model: 'Galaxy Watch7',
      title: 'Samsung Galaxy Watch7 (44mm, BT)',
      description: 'Advanced health tracking with a vivid AMOLED display.',
      specs: {
        display: '1.5" AMOLED',
        gps: true,
        batteryMah: 425,
        warrantyMonths: 12,
      },
      price: 31999,
      mrp: 34999,
      hsn: '9102',
      media: [img('1546868871-7041f2a55e12')],
      quantity: 18,
    },
    {
      categoryId: tablets.id,
      brand: 'Samsung',
      model: 'Galaxy Tab S9',
      title: 'Samsung Galaxy Tab S9 (8GB/128GB)',
      description: 'Premium tablet with Dynamic AMOLED 2X and S Pen included.',
      specs: {
        processor: 'Snapdragon 8 Gen 2',
        ram: '8GB',
        storage: '128GB',
        display: '11" Dynamic AMOLED 2X',
        warrantyMonths: 12,
      },
      price: 72999,
      mrp: 79999,
      hsn: '8471',
      media: [img('1544244015-0df4b3ffc6b0')],
      quantity: 11,
    },
  ];

  const existing = await prisma.product.count({ where: { shopId: shop.id } });
  if (existing === 0) {
    for (const p of catalog) {
      await prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: p.categoryId,
          brand: p.brand,
          model: p.model,
          title: p.title,
          description: p.description,
          specs: p.specs,
          price: new Prisma.Decimal(p.price),
          mrp: new Prisma.Decimal(p.mrp),
          hsnCode: p.hsn,
          gstRate: new Prisma.Decimal(18),
          media: p.media,
          inventory: { create: { quantity: p.quantity, reorderLevel: 2 } },
        },
      });
    }
    // eslint-disable-next-line no-console
    console.log(`Seeded ${catalog.length} products with images.`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`Products already exist (${existing}); skipping catalog seed.`);
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete. Owner login -> phone: 9000000001, pw: password123');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
