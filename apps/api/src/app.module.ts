import { Module } from '@nestjs/common';
import { MoneyModule } from './money/money.module';
import { ActionsModule } from './actions/actions.module';
import { SupplyModule } from './supply/supply.module';

@Module({
  imports: [MoneyModule, ActionsModule, SupplyModule],
})
export class AppModule {}
