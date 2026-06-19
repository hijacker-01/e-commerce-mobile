import { Module } from '@nestjs/common';
import { StockistsService } from './stockists.service';
import { StockistsController } from './stockists.controller';

@Module({
  providers: [StockistsService],
  controllers: [StockistsController],
})
export class StockistsModule {}
