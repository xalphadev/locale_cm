import { ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * Non-money customer actions (check-in / quest progress). Check-in is the EARN side: it records
 * a verified visit and advances the quest; when the last step completes, fn_advance_quest calls
 * fn_grant_coins (the money-plane) inside the same DB transaction. The geofence (PostGIS) is the
 * prod gate (fn_check_in); this demo path records a pre-verified visit.
 */
@Injectable()
export class ActionsService {
  constructor(private readonly db: DbService) {}

  async checkIn(userId: string, questId: string, stepId: string): Promise<{ status: string }> {
    try {
      return await this.db.withClient(async (c) => {
        await c.query('BEGIN');
        try {
          const cin = await c.query(
            `INSERT INTO check_ins(user_id,place_id,merchant_id,city_id,quest_step_id,trust_tier,method)
             SELECT $1, qs.place_id, p.merchant_id, qs.city_id, qs.id, 'verified_visit','rotating_qr'
             FROM quest_steps qs JOIN places p ON p.id=qs.place_id WHERE qs.id=$2 RETURNING id`,
            [userId, stepId]);
          if (cin.rowCount === 0) throw new Error('check-in: quest step not found');
          const r = await c.query(`SELECT fn_advance_quest($1,$2,$3,$4) AS status`,
            [userId, questId, stepId, cin.rows[0].id]);
          await c.query('COMMIT');
          return { status: r.rows[0].status as string };
        } catch (e) { await c.query('ROLLBACK'); throw e; }
      });
    } catch (e: any) {
      const msg = e?.message ?? 'check-in failed';
      if (/anti-self/i.test(msg)) throw new ForbiddenException(msg);
      if (/COGS|fail-closed|frozen|reservation|insufficient/i.test(msg)) throw new ConflictException(msg);
      throw new UnprocessableEntityException(msg);
    }
  }
}
