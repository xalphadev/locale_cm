import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { MoneyController } from './money.controller';
import { MoneyService } from './money.service';

@Module({
  controllers: [MoneyController],
  providers: [MoneyService, DbService],
})
export class MoneyModule {}
