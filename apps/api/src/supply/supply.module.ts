import { Module } from '@nestjs/common';
import { SupplyController } from './supply.controller';
import { SupplyService } from './supply.service';
import { DbService } from '../db/db.service';

@Module({
  controllers: [SupplyController],
  providers: [SupplyService, DbService],
})
export class SupplyModule {}
