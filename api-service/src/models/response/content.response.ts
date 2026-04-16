import { ApiProperty } from '@nestjs/swagger';

export class FrequencyCap {
  @ApiProperty({ example: 3 })
  limit!: number;

  @ApiProperty({ enum: ['hour', 'day', 'week'] })
  period!: 'hour' | 'day' | 'week';
}

export class Schedule {
  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  startTime!: Date;

  @ApiProperty({ example: '2024-12-31T23:59:59Z' })
  endTime!: Date;

  @ApiProperty({ example: 'UTC', required: false })
  timezone?: string;
}
export class TrackingData {
  @ApiProperty({ example: 'https://api.example.com/track/impression/12345' })
  impressionUrl!: string;

  @ApiProperty({ example: 'https://api.example.com/track/click/12345' })
  clickUrl!: string;

  @ApiProperty({ example: 'https://api.example.com/track/close/12345', required: false })
  closeUrl?: string;
}

export class DisplayRules {
  @ApiProperty({ example: 1000 })
  maxImpressions!: number;

  @ApiProperty({ type: FrequencyCap })
  frequencyCap!: FrequencyCap;

  @ApiProperty({ type: Schedule })
  schedule!: Schedule;

  @ApiProperty({ example: ['premium_users', 'new_customers'] })
  targetSegments!: string[];
}

export class ResponseMetadata {
  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  timestamp!: Date;

  @ApiProperty({ example: 'req_123456789' })
  requestId!: string;

  @ApiProperty({ example: 'user_12345' })
  userId!: string;

  @ApiProperty({ example: 'tenant_abc123' })
  tenantId!: string;

  @ApiProperty({ example: 150 })
  processingTimeMs!: number;

  @ApiProperty({ example: 5 })
  contentCount!: number;

    @ApiProperty({ example: false, required: false })
  cached?: boolean;

  @ApiProperty({ example: 'Something went wrong', required: false })
  error?: string;

}
export class ContentItem {
  @ApiProperty({ example: 'content_12345' })
  id!: string;

  @ApiProperty({ enum: ['banner', 'video', 'popup'] })
  type!: 'banner' | 'video' | 'popup';

  @ApiProperty({ example: 'Summer Sale Banner' })
  title!: string;

  @ApiProperty({ example: 'Get 50% off on all products!' })
  content!: string;

  @ApiProperty({ example: 'campaign_67890' })
  campaignId!: string;

  @ApiProperty({ example: 5 })
  priority!: number;

  @ApiProperty({ type: DisplayRules })
  displayRules!: DisplayRules;

  @ApiProperty({ type: TrackingData })
  tracking!: TrackingData;

  @ApiProperty({ example: 'https://cdn.example.com/banner.jpg' })
  mediaUrl!: string;

  @ApiProperty({ example: { backgroundColor: '#FF0000', textColor: '#FFFFFF' }, required: false })
  styles?: Record<string, any>;
}

export class ContentResponse {
  @ApiProperty({ description: 'Success flag' })
  success!: boolean;

  @ApiProperty({ description: 'List of content items', type: [ContentItem] })
  content!: ContentItem[];

  @ApiProperty({ description: 'Request metadata', type: ResponseMetadata })
  metadata!: ResponseMetadata;
}










