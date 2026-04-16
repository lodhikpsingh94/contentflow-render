import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class CampaignMetadataDto {
  @ApiPropertyOptional() @IsString() @IsOptional() content?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() imageUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() actionUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() placementId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bannerColor?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bannerIcon?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaBackgroundColor?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaTextColor?: string;

}

class CampaignScheduleDto {
  @ApiProperty() @IsDateString() startTime!: string;
  @ApiProperty() @IsDateString() endTime!: string;
}

export class CreateCampaignDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() type!: string;
  @ApiProperty() @IsString() @IsNotEmpty() subType!: string;
  
  @ApiProperty({ type: [String] }) @IsArray() @IsNotEmpty({ each: true }) segments!: string[];
  
  @ApiProperty()
  @ValidateNested()
  @Type(() => CampaignScheduleDto)
  schedule!: CampaignScheduleDto;

  @ApiProperty() @IsNumber() @Min(1) @Max(10) priority!: number;

  // --- THIS IS THE FIX ---
  // Mark as optional to satisfy TypeScript's strict initialization rules
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignMetadataDto)
  metadata?: CampaignMetadataDto;
}