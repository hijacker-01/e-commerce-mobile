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
  const accessories = await category('Mobile Accessory', 'accessory');

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

  // Mobile accessories — added idempotently so they appear even on an
  // already-seeded database (no processor spec; their own facets instead).
  const accessoryCatalog = [
    {
      brand: 'Samsung',
      model: '45W Adapter',
      title: 'Samsung 45W USB-C Super Fast Charger',
      description: 'Super Fast Charging 2.0 power adapter with USB-C cable.',
      specs: { type: 'Charger', wattage: '45W', warrantyMonths: 12 },
      price: 2999,
      mrp: 3499,
      media: [img('1583394838336-acd977736f90')],
      quantity: 40,
    },
    {
      brand: 'Anker',
      model: 'PowerCore 20000',
      title: 'Anker PowerCore 20000mAh Power Bank',
      description: 'High-capacity power bank with 20W USB-C PD output.',
      specs: { type: 'Power bank', capacity: '20000mAh', wattage: '20W', warrantyMonths: 18 },
      price: 3499,
      mrp: 4999,
      media: [img('1609091839311-d5365f9ff1c5')],
      quantity: 30,
    },
    {
      brand: 'Spigen',
      model: 'Tough Armor S24',
      title: 'Spigen Tough Armor Case — Galaxy S24 Ultra',
      description: 'Rugged dual-layer protective case with kickstand.',
      specs: { type: 'Case', compatibility: 'Galaxy S24 Ultra', warrantyMonths: 6 },
      price: 1799,
      mrp: 2499,
      media: [img('1601593346740-925612772716')],
      quantity: 50,
    },
    {
      brand: 'Samsung',
      model: 'USB-C Cable 1.8m',
      title: 'Samsung USB-C to USB-C Cable (1.8m)',
      description: 'Durable braided 100W USB-C charging & data cable.',
      specs: { type: 'Cable', wattage: '100W', warrantyMonths: 6 },
      price: 799,
      mrp: 1099,
      media: [img('1558756520-22cfe5d382ca')],
      quantity: 80,
    },
    {
      brand: 'Samsung',
      model: '15W Wireless Pad',
      title: 'Samsung 15W Wireless Charger Pad',
      description: 'Fast wireless charging pad with adaptive cooling.',
      specs: { type: 'Wireless charger', wattage: '15W', warrantyMonths: 12 },
      price: 2499,
      mrp: 2999,
      media: [img('1586953208448-b95a79798f07')],
      quantity: 35,
    },
  ];

  const accessoryCount = await prisma.product.count({
    where: { categoryId: accessories.id },
  });
  if (accessoryCount === 0) {
    for (const a of accessoryCatalog) {
      await prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: accessories.id,
          brand: a.brand,
          model: a.model,
          title: a.title,
          description: a.description,
          specs: a.specs as Prisma.InputJsonValue,
          price: new Prisma.Decimal(a.price),
          mrp: new Prisma.Decimal(a.mrp),
          hsnCode: '8504',
          gstRate: new Prisma.Decimal(18),
          media: a.media,
          inventory: { create: { quantity: a.quantity, reorderLevel: 5 } },
        },
      });
    }
    // eslint-disable-next-line no-console
    console.log(`Seeded ${accessoryCatalog.length} mobile accessories.`);
  }

  // Variants — group flagship models into storage × colour SKUs (idempotent).
  // Relabel the base/existing rows (created by the catalog/earlier seed runs).
  const relabels: { title: string; group: string; label: string }[] = [
    {
      title: 'Samsung Galaxy S24 Ultra 5G (12GB/256GB)',
      group: 's24ultra',
      label: '256GB · Titanium Black',
    },
    {
      title: 'Samsung Galaxy S24 Ultra 5G (12GB/512GB)',
      group: 's24ultra',
      label: '512GB · Titanium Black',
    },
    {
      title: 'Samsung Galaxy A55 5G (8GB/128GB)',
      group: 'a55',
      label: '128GB · Awesome Navy',
    },
    {
      title: 'Samsung Galaxy A55 5G (8GB/256GB)',
      group: 'a55',
      label: '256GB · Awesome Navy',
    },
  ];
  for (const r of relabels) {
    await prisma.product.updateMany({
      where: { title: r.title },
      data: { variantGroup: r.group, variantLabel: r.label },
    });
  }

  const variantSiblings = [
    {
      group: 's24ultra',
      categoryId: mobiles.id,
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      title: 'Samsung Galaxy S24 Ultra 5G (12GB/512GB)',
      label: '512GB · Titanium Black',
      description:
        'Flagship Galaxy with titanium frame, 200MP camera and Galaxy AI.',
      specs: {
        processor: 'Snapdragon 8 Gen 3',
        ram: '12GB',
        storage: '512GB',
        display: '6.8" QHD+ AMOLED 120Hz',
        batteryMah: 5000,
        warrantyMonths: 12,
      },
      price: 134999,
      mrp: 144999,
      media: [img('1610945265064-0e34e5519bbf')],
      quantity: 5,
    },
    {
      group: 's24ultra',
      categoryId: mobiles.id,
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      title: 'Samsung Galaxy S24 Ultra 5G (12GB/256GB) — Titanium Gray',
      label: '256GB · Titanium Gray',
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
      media: [img('1511707171634-5f897ff02aa9')],
      quantity: 7,
    },
    {
      group: 'a55',
      categoryId: mobiles.id,
      brand: 'Samsung',
      model: 'Galaxy A55',
      title: 'Samsung Galaxy A55 5G (8GB/256GB)',
      label: '256GB · Awesome Navy',
      description: 'Mid-range 5G phone with a brilliant Super AMOLED display.',
      specs: {
        processor: 'Exynos 1480',
        ram: '8GB',
        storage: '256GB',
        batteryMah: 5000,
        btVersion: '5.3',
        warrantyMonths: 12,
      },
      price: 37999,
      mrp: 42999,
      media: [img('1511707171634-5f897ff02aa9')],
      quantity: 10,
    },
    {
      group: 'a55',
      categoryId: mobiles.id,
      brand: 'Samsung',
      model: 'Galaxy A55',
      title: 'Samsung Galaxy A55 5G (8GB/128GB) — Awesome Lilac',
      label: '128GB · Awesome Lilac',
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
      media: [img('1610945265064-0e34e5519bbf')],
      quantity: 12,
    },
  ];
  for (const v of variantSiblings) {
    const exists = await prisma.product.count({ where: { title: v.title } });
    if (!exists) {
      await prisma.product.create({
        data: {
          shopId: shop.id,
          categoryId: v.categoryId,
          brand: v.brand,
          model: v.model,
          title: v.title,
          description: v.description,
          specs: v.specs as Prisma.InputJsonValue,
          price: new Prisma.Decimal(v.price),
          mrp: new Prisma.Decimal(v.mrp),
          hsnCode: '8517',
          gstRate: new Prisma.Decimal(18),
          media: v.media,
          variantGroup: v.group,
          variantLabel: v.label,
          inventory: { create: { quantity: v.quantity, reorderLevel: 2 } },
        },
      });
    }
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
