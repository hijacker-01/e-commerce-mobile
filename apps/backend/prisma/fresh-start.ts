// Fresh real shop: wipes ALL demo/transactional data and creates a single
// real OWNER account. Keeps the shop identity (name/address) and the category
// list, so the owner can start adding real inventory immediately.
//
// Run on Railway (API service → Console tab):
//   node dist/prisma/fresh-start.js "<owner name>" "<phone>" "<password>"
// Example:
//   node dist/prisma/fresh-start.js "Prakash Gupta" "9876543210" "MyStrongPass#1"
//
// Destructive: every demo product, order, customer, employee and stockist is
// removed. There is no undo — take a DB backup first if unsure.
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [name, phone, password] = process.argv.slice(2);
  if (!name || !phone || !password) {
    console.error(
      'Usage: node dist/prisma/fresh-start.js "<owner name>" "<phone>" "<password>"',
    );
    process.exit(1);
  }

  // 1) Wipe all transactional + catalog data (children first for FK safety).
  await prisma.message.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.creditLedger.deleteMany();
  await prisma.creditAccount.deleteMany();
  await prisma.return.deleteMany();
  await prisma.warrantyCard.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockistOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productQuestion.deleteMany();
  await prisma.specialOffer.deleteMany();
  await prisma.specialLobbyItem.deleteMany();
  await prisma.deviceKB.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.exchangeRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.stockist.deleteMany();
  await prisma.serviceCenter.deleteMany();
  await prisma.auditLog.deleteMany();

  // 2) Create (or reset) the real owner.
  const passwordHash = await bcrypt.hash(password, 10);
  const owner = await prisma.user.upsert({
    where: { phone },
    update: { name, role: Role.OWNER, passwordHash, isActive: true },
    create: { name, phone, role: Role.OWNER, passwordHash },
  });

  // 3) Point the existing shop at the new owner AND set its real contact
  //    details (name/address/phone) so the storefront shows the owner's number.
  const shop = await prisma.shop.findFirst();
  if (shop) {
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        ownerId: owner.id,
        name: 'Prakash Mobile',
        address: 'Mannat Complex, Gadarwara',
        phone,
      },
    });
  } else {
    await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: 'Prakash Mobile',
        address: 'Mannat Complex, Gadarwara',
        phone,
      },
    });
  }

  // 4) Remove every other user (old demo owner, employees, stockists, customers).
  const removed = await prisma.user.deleteMany({
    where: { id: { not: owner.id } },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Fresh shop ready. Removed ${removed.count} other user(s). ` +
      `Owner login -> phone: ${phone}`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
