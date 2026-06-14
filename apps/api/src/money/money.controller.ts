import { randomUUID } from 'crypto';
import { Body, Controller, Headers, Post } from '@nestjs/common';
import { MoneyService } from './money.service';
import { FundQuestDto, GrantDto, PrefundDto, PspSettleDto, RedeemDto } from './dto';

/**
 * Money-plane HTTP surface. Every write requires an Idempotency-Key header (replayed key =
 * no-op, returns the original txn). Auth/RBAC guard (JWT scope-in-token) is wired at the
 * gateway in a later step; the DB enforces the money invariants regardless.
 */
@Controller('money')
export class MoneyController {
  constructor(private readonly money: MoneyService) {}

  private idem(h?: string) {
    return h && h.length > 0 ? h : randomUUID();
  }

  @Post('prefund')
  prefund(@Body() d: PrefundDto, @Headers('idempotency-key') k?: string) {
    return this.money.prefund(d, this.idem(k));
  }

  @Post('psp-settle')
  pspSettle(@Body() d: PspSettleDto, @Headers('idempotency-key') k?: string) {
    return this.money.pspSettle(d, this.idem(k));
  }

  @Post('fund-quest')
  fundQuest(@Body() d: FundQuestDto, @Headers('idempotency-key') k?: string) {
    return this.money.fundQuest(d, this.idem(k));
  }

  @Post('grant')
  grant(@Body() d: GrantDto, @Headers('idempotency-key') k?: string) {
    return this.money.grant(d, this.idem(k));
  }

  @Post('redeem')
  redeem(@Body() d: RedeemDto, @Headers('idempotency-key') k?: string) {
    return this.money.redeem(d, this.idem(k));
  }
}
