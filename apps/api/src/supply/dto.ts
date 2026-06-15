import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

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

/** An admin/moderator approving a proposal. reviewerId MUST differ from the proposer (SoD). */
export class ApproveDto {
  @IsUUID() reviewerId!: string;
}
