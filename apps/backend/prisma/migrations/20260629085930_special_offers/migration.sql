-- CreateTable
CREATE TABLE "SpecialOffer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specialPrice" DECIMAL(12,2) NOT NULL,
    "originalPrice" DECIMAL(12,2) NOT NULL,
    "lowestPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialOffer_productId_key" ON "SpecialOffer"("productId");

-- AddForeignKey
ALTER TABLE "SpecialOffer" ADD CONSTRAINT "SpecialOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
