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

  const mobiles = await prisma.category.upsert({
    where: { slug: 'mobile' },
    update: {},
    create: { name: 'Mobile', slug: 'mobile' },
  });

  await prisma.category.upsert({
    where: { slug: 'headphone' },
    update: {},
    create: { name: 'Headphone', slug: 'headphone' },
  });

  await prisma.product.create({
    data: {
      shopId: shop.id,
      categoryId: mobiles.id,
      brand: 'Samsung',
      model: 'Galaxy A55',
      title: 'Samsung Galaxy A55 5G (8GB/128GB)',
      description: 'Mid-range 5G phone with great display.',
      specs: {
        processor: 'Exynos 1480',
        ram: '8GB',
        storage: '128GB',
        batteryMah: 5000,
        btVersion: '5.3',
        warrantyMonths: 12,
      } as Prisma.InputJsonValue,
      price: new Prisma.Decimal(33999),
      mrp: new Prisma.Decimal(39999),
      hsnCode: '8517',
      gstRate: new Prisma.Decimal(18),
      videoLinks: ['https://www.youtube.com/watch?v=example'],
      inventory: { create: { quantity: 10, reorderLevel: 2 } },
    },
  });

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
