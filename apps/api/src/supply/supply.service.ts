import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreatePlaceDto } from './dto';

/**
 * Content-supply pipeline (NON-money). Field agents never write `places` directly — they submit
 * a change_proposal; an admin (different person, SoD) approves, and fn_apply_proposal is the single
 * writer that creates/updates the live place + history snapshot + freshness. Single-city MVP (CNX).
 */
@Injectable()
export class SupplyService {
  constructor(private readonly db: DbService) {}

  /** Build the diff->'after' JSON the DB functions expect (snake_case keys). */
  private toAfter(dto: CreatePlaceDto): Record<string, unknown> {
    const after: Record<string, unknown> = {
      name_i18n: dto.nameI18n,
      category: dto.category,
      subcategory: dto.subcategory,
      lng: dto.lng,
      lat: dto.lat,
    };
    if (dto.descriptionI18n) after.description_i18n = dto.descriptionI18n;
    if (dto.districtId) after.district_id = dto.districtId;
    if (dto.phone) after.phone = dto.phone;
    if (dto.lineId) after.line_id = dto.lineId;
    if (dto.website) after.website = dto.website;
    if (dto.priceBand) after.price_band = dto.priceBand;
    if (dto.amenities?.length) after.amenities = dto.amenities;
    return after;
  }

  async createPlaceProposal(dto: CreatePlaceDto): Promise<{ proposalId: string; status: string }> {
    try {
      const { rows } = await this.db.pool.query(
        `INSERT INTO change_proposals(target_type,target_id,city_id,proposed_by,proposer_role,diff,status)
         SELECT 'place', NULL, c.id, $1, 'field_agent', jsonb_build_object('after',$2::jsonb), 'pending'
         FROM cities c WHERE c.code='CNX'
         RETURNING id`,
        [dto.proposedBy, JSON.stringify(this.toAfter(dto))]);
      if (rows.length === 0) throw new Error('city CNX not found');
      return { proposalId: rows[0].id as string, status: 'pending' };
    } catch (e: any) {
      throw new UnprocessableEntityException(e?.message ?? 'create proposal failed');
    }
  }

  async pending(): Promise<unknown[]> {
    const { rows } = await this.db.pool.query(
      `SELECT cp.id,
              cp.diff->'after'->'name_i18n'        AS name_i18n,
              cp.diff->'after'->>'category'        AS category,
              cp.diff->'after'->>'subcategory'     AS subcategory,
              cp.diff->'after'->>'price_band'      AS price_band,
              cp.diff->'after'->>'phone'           AS phone,
              cp.proposed_by, cp.created_at
       FROM change_proposals cp
       WHERE cp.status='pending' AND cp.target_type='place'
       ORDER BY cp.created_at DESC`);
    return rows;
  }

  async approve(proposalId: string, reviewerId: string): Promise<{ applied: boolean; version: number; placeId: string | null; status: string }> {
    try {
      const version = await this.db.callFn<number>('fn_apply_proposal', [proposalId, reviewerId]);
      const { rows } = await this.db.pool.query(
        `SELECT target_id, status FROM change_proposals WHERE id=$1`, [proposalId]);
      return { applied: true, version, placeId: rows[0]?.target_id ?? null, status: rows[0]?.status ?? 'approved' };
    } catch (e: any) {
      const msg = e?.message ?? 'approve failed';
      if (/SoD|reviewer == proposer/i.test(msg)) throw new ForbiddenException(msg);
      if (/not found/i.test(msg)) throw new NotFoundException(msg);
      if (/not pending/i.test(msg)) throw new ConflictException(msg);
      throw new UnprocessableEntityException(msg);
    }
  }
}
