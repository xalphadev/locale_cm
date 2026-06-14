import { Module } from '@nestjs/common';
import { MoneyModule } from './money/money.module';

@Module({
  imports: [MoneyModule],
})
export class AppModule {}
