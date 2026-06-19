import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { InvoicesModule } from './billing/invoices.module';
import { AiModule } from './ai/ai.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponsModule } from './coupons/coupons.module';
import { CreditModule } from './credit/credit.module';
import { ExchangeModule } from './exchange/exchange.module';
import { DirectoryModule } from './directory/directory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    InvoicesModule,
    AiModule,
    CartModule,
    PaymentsModule,
    ChatModule,
    ReviewsModule,
    CouponsModule,
    CreditModule,
    ExchangeModule,
    DirectoryModule,
    NotificationsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
