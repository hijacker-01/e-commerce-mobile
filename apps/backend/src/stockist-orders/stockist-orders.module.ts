import { Module } from '@nestjs/common';
import { StockistOrdersService } from './stockist-orders.service';
import { StockistOrdersController } from './stockist-orders.controller';

@Module({
  providers: [StockistOrdersService],
  controllers: [StockistOrdersController],
})
export class StockistOrdersModule {}
