import { Module } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';

@Module({
  controllers: [ActionsController],
  providers: [ActionsService, DbService],
})
export class ActionsModule {}
