import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Single pg Pool for the money-plane. The DATABASE_URL role must hold `money_writer`
 * (the only DB role allowed to INSERT into the ledger). Use SESSION-mode pooling on
 * this path — the money fns take row locks (SELECT ... FOR UPDATE).
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    // session-mode: each acquired client is a real backend; safe for FOR UPDATE txns
  });

  /** Call a money fn as a single autocommitted statement (deferred balance triggers fire at commit). */
  async callFn<T = string>(fn: string, args: unknown[]): Promise<T> {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await this.pool.query(`SELECT ${fn}(${placeholders}) AS result`, args);
    return rows[0].result as T;
  }

  async withClient<T>(work: (c: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await work(client);
    } finally {
      client.release();
    }
  }

  onModuleDestroy() {
    return this.pool.end();
  }
}
