import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested,
  IsDateString, IsNumber, Min, Max, IsBoolean, IsIn
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Bilingual content block ──────────────────────────────────────────────────
class ContentBlockDto {
  @ApiPropertyOptional() @IsString() @IsOptional() headline?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() body?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mediaUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mediaType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() direction?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() whatsappTemplateId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() smsFrom?: string;
}

class BilingualContentDto {
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ContentBlockDto) ar?: ContentBlockDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ContentBlockDto) en?: ContentBlockDto;
}

// ─── Legacy metadata (banner/popup/video visual editor) ───────────────────────
class CampaignMetadataDto {
  @ApiPropertyOptional() @IsString() @IsOptional() content?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contentText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() imageUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() actionUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() placementId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bannerColor?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bannerIcon?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaBackgroundColor?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaTextColor?: string;
}

// ─── Hijri date ───────────────────────────────────────────────────────────────
class HijriDateDto {
  @ApiProperty() @IsNumber() year!: number;
  @ApiProperty() @IsNumber() month!: number;
  @ApiProperty() @IsNumber() day!: number;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
class CampaignScheduleDto {
  @ApiProperty() @IsDateString() startTime!: string;
  @ApiProperty() @IsDateString() endTime!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() timezone?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() prayerTimeBlackout?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() prayerTimeCity?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() seasonalTag?: string | null;

  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => HijriDateDto) hijriStart?: HijriDateDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => HijriDateDto) hijriEnd?: HijriDateDto;
}

// ─── Budget ───────────────────────────────────────────────────────────────────
class CampaignBudgetDto {
  @ApiPropertyOptional() @IsNumber() @IsOptional() total?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() currency?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() dailyCap?: number;
}

// ─── Main DTO ─────────────────────────────────────────────────────────────────
export class CreateCampaignDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;

  @ApiProperty() @IsString() @IsNotEmpty() type!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() subType?: string;

  // Bilingual content (new channels: sms, whatsapp, push, inapp)
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualContentDto)
  content?: BilingualContentDto;

  // Placement IDs
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  placementIds?: string[];

  @ApiProperty({ type: [String] }) @IsArray() segments!: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => CampaignScheduleDto)
  schedule!: CampaignScheduleDto;

  @ApiProperty() @IsNumber() @Min(1) @Max(10) priority!: number;

  // Budget (SAR default on backend)
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignBudgetDto)
  budget?: CampaignBudgetDto;

  // Legacy visual-editor metadata (banner / popup / video)
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignMetadataDto)
  metadata?: CampaignMetadataDto;
}
