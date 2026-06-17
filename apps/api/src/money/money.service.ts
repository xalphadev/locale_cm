import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { FundQuestDto, GrantDto, PayoutDto, PrefundDto, PspSettleDto, RedeemDto } from './dto';

/**
 * Typed RPC over the canonical plpgsql money functions (db/migrations/0005). NestJS does NO
 * money arithmetic and posts NO ledger legs itself — it validates input, supplies the
 * idempotency key, calls the one gate+post fn per txn, and maps DB errors to HTTP. The DB
 * (append-only + sum-to-zero + clearing-flat + money_writer) is the referee.
 */
@Injectable()
export class MoneyService {
  constructor(private readonly db: DbService) {}

  prefund(d: PrefundDto, idem: string) {
    return this.call('fn_prefund', [d.merchantId, d.cityId, d.grossMinor, d.feeMinor, d.psp, idem]);
  }
  pspSettle(d: PspSettleDto, idem: string) {
    return this.call('fn_psp_settle', [d.merchantId, d.cityId, d.amountMinor, d.psp, idem]);
  }
  fundQuest(d: FundQuestDto, idem: string) {
    return this.call('fn_fund_quest', [d.questId, d.poolMinor, idem]);
  }
  grant(d: GrantDto, idem: string) {
    return this.call('fn_grant_coins', [d.userId, d.questId, idem]);
  }
  redeem(d: RedeemDto, idem: string) {
    return this.call('fn_redeem', [d.userId, d.redeemMerchantId, d.coinMinor, idem]);
  }
  payout(d: PayoutDto, idem: string) {
    return this.call('fn_payout_merchant', [d.merchantId, d.amountMinor, d.createdBy, d.approvedBy, idem]);
  }

  private async call(fn: string, args: unknown[]): Promise<{ id: string }> {
    try {
      const id = await this.db.callFn<string>(fn, args);
      return { id };
    } catch (e: any) {
      const msg: string = e?.message ?? 'money operation failed';
      // map the plpgsql RAISE messages to meaningful HTTP statuses
      if (/anti-self-redemption/i.test(msg)) throw new ForbiddenException(msg);
      if (/COGS caps unset|fail-closed|frozen|insufficient|cap exceeded|reservation/i.test(msg))
        throw new ConflictException(msg);
      throw new UnprocessableEntityException(msg);
    }
  }
}
