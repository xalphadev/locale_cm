import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { SupplyService } from './supply.service';
import { ApproveDto, CreatePlaceDto } from './dto';

@Controller('supply')
export class SupplyController {
  constructor(private readonly svc: SupplyService) {}

  /** Field agent proposes a new place → pending change_proposal. */
  @Post('proposals')
  @HttpCode(201)
  create(@Body() dto: CreatePlaceDto) {
    return this.svc.createPlaceProposal(dto);
  }

  /** Admin queue: pending place proposals awaiting review. */
  @Get('proposals/pending')
  pending() {
    return this.svc.pending();
  }

  /** Admin approves (SoD: reviewer must differ from proposer) → place goes live. */
  @Post('proposals/:id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveDto) {
    return this.svc.approve(id, dto.reviewerId);
  }
}
