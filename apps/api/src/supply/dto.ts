import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/** A field agent's proposal to create a NEW place. Lands as a pending change_proposal (target_id NULL). */
export class CreatePlaceDto {
  @IsUUID() proposedBy!: string;                 // the field-agent user id (author)
  @IsObject() nameI18n!: Record<string, string>; // {th, en, ...}
  @IsOptional() @IsObject() descriptionI18n?: Record<string, string>;
  @IsIn(['eat', 'see', 'do']) category!: string;
  @IsString() subcategory!: string;              // cafe | restaurant | temple | ...
  @IsNumber() lng!: number;
  @IsNumber() lat!: number;
  @IsOptional() @IsUUID() districtId?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() lineId?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsIn(['1', '2', '3', '4']) priceBand?: string; // ฿..฿฿฿฿
  @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
}

/** A field agent's proposal to create a NEW event (กิจกรรม). Lands as a pending change_proposal. */
export class CreateEventDto {
  @IsUUID() proposedBy!: string;
  @IsObject() titleI18n!: Record<string, string>;
  @IsOptional() @IsObject() descriptionI18n?: Record<string, string>;
  @IsIn(['festival', 'market', 'performance', 'workshop', 'seasonal']) kind!: string;
  @IsString() startsAt!: string;                 // ISO / datetime-local
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsUUID() districtId?: string;
  @IsOptional() @IsUUID() placeId?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isRecurring?: boolean;
  @IsOptional() @IsString() recurrence?: string;
}

/** An admin/moderator approving a proposal. reviewerId MUST differ from the proposer (SoD). */
export class ApproveDto {
  @IsUUID() reviewerId!: string;
}
