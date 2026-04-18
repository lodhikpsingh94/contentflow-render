import { IsString, IsObject, IsOptional, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// --- UPDATED DEVICE INFO ---
export class DeviceInfo {
  @ApiProperty({ enum: ['ios', 'android', 'web', 'Web'] })
  @IsEnum(['ios', 'android', 'web', 'Web']) // Allow Capitalized 'Web'
  platform!: 'ios' | 'android' | 'web' | 'Web';

  @ApiProperty({ example: '15.0' })
  @IsString()
  @IsOptional() // Made optional as web might not always have it
  osVersion?: string;

  @ApiProperty({ example: '2.1.0', required: false })
  @IsString()
  @IsOptional() // Made optional (SDK wasn't sending it)
  appVersion?: string;

  @ApiProperty({ example: 'iPhone13,4' })
  @IsString()
  @IsOptional()
  deviceModel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  // --- NEW FIELDS SENT BY SDK ---
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sdkVersion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  screenResolution?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  networkType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({ required: false, example: 'stc' })
  @IsOptional()
  @IsString()
  networkOperator?: string;
}

// --- UPDATED LOCATION DATA ---
export class LocationData {
  @ApiProperty({ example: 'US', required: false })
  @IsString()
  @IsOptional() // Made optional so sending {} works
  country?: string;

  @ApiProperty({ example: 'California', required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: 'San Francisco', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: '37.7749', required: false })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiProperty({ example: '-122.4194', required: false })
  @IsOptional()
  @IsString()
  longitude?: string;
}

// --- MAIN REQUEST ---
export class GetContentRequest {
  @ApiProperty({ description: 'User ID', example: 'user_12345' })
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Device information' })
  @ValidateNested()
  @Type(() => DeviceInfo)
  deviceInfo!: DeviceInfo;

  @ApiProperty({ description: 'User location data', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationData)
  location?: LocationData;

  @ApiProperty({ description: 'Additional context', required: false, example: { page: 'home', section: 'banner' } })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiProperty({ description: 'Requested content types', required: false, enum: ['banner', 'video', 'popup', 'inapp_notification', 'push_notification'] })
  @IsOptional()
  @IsArray()
  @IsEnum(['banner', 'video', 'popup', 'inapp_notification', 'push_notification'], { each: true })
  contentTypes?: string[];

  @ApiProperty({ description: 'Identifier for the content placement area in the app', example: 'dashboard_top' })
  @IsString()
  placementId!: string;

  @ApiProperty({ description: 'User preferred language for content delivery', required: false, enum: ['ar', 'en'] })
  @IsOptional()
  @IsString()
  preferredLanguage?: 'ar' | 'en';
}