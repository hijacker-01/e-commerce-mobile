import { Module } from '@nestjs/common';
import { SpecialService } from './special.service';
import { SpecialController } from './special.controller';

@Module({
  providers: [SpecialService],
  controllers: [SpecialController],
})
export class SpecialModule {}
