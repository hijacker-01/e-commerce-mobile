-- CreateEnum
CREATE TYPE "StockistOrderStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stockistPrice" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "StockistOrder" (
    "id" TEXT NOT NULL,
    "stockistId" TEXT NOT NULL,
    "status" "StockistOrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "items" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "schemeDiscountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "schemeFreeUnits" INTEGER NOT NULL DEFAULT 0,
    "schemeNote" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "challanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockistOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockistOrder_stockistId_idx" ON "StockistOrder"("stockistId");

-- AddForeignKey
ALTER TABLE "StockistOrder" ADD CONSTRAINT "StockistOrder_stockistId_fkey" FOREIGN KEY ("stockistId") REFERENCES "Stockist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
