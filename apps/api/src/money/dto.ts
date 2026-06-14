import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/** All amounts are satang / coin-minor (BIGINT). 1 COIN = 1 THB = 100 minor. */

export class PrefundDto {
  @IsUUID() merchantId!: string;
  @IsUUID() cityId!: string;
  @IsInt() @Min(1) grossMinor!: number;
  @IsInt() @Min(0) feeMinor = 0;
  @IsString() psp!: string; // omise | 2c2p | fiuu | promptpay | alipay | wechat
}

export class PspSettleDto {
  @IsUUID() merchantId!: string;
  @IsUUID() cityId!: string;
  @IsInt() @Min(1) amountMinor!: number;
  @IsString() psp!: string;
}

export class FundQuestDto {
  @IsUUID() questId!: string;
  @IsInt() @Min(1) poolMinor!: number;
}

export class GrantDto {
  @IsUUID() userId!: string;
  @IsUUID() questId!: string;
}

export class RedeemDto {
  @IsUUID() userId!: string;
  @IsUUID() redeemMerchantId!: string;
  @IsInt() @Min(1) coinMinor!: number;
}

/** Idempotency key is required on every money write (maps to ledger_transactions.idempotency_key). */
export class WithIdem {
  @IsString() @IsOptional() idempotencyKey?: string;
}
