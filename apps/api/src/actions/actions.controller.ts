import { Body, Controller, Post } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { ActionsService } from './actions.service';

class CheckInDto {
  @IsUUID() userId!: string;
  @IsUUID() questId!: string;
  @IsUUID() stepId!: string;
}

@Controller('actions')
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  /** Record a (pre-verified) visit and advance the quest; completing it mints the reward. */
  @Post('checkin')
  checkin(@Body() d: CheckInDto) {
    return this.actions.checkIn(d.userId, d.questId, d.stepId);
  }
}
