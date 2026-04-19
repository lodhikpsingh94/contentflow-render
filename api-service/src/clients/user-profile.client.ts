import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import { ServiceResponse } from '../models/shared/common.types';

/**
 * Minimal user context needed at campaign evaluation time.
 * Fetched from user-segmentation-service and cached in Redis.
 */
export interface UserEvalContext {
  userId: string;
  /** Pre-computed segment IDs from the last background segment refresh. */
  segments: string[];
  /** PDPL consent state — evaluated before any campaign targeting. */
  consent: {
    marketing: boolean;
    push: boolean;
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
    locationTracking: boolean;
    pdplOptOut: boolean;
  };
  demographic: {
    country: string;
    language: string;
    nationality?: string;
  };
  device: {
    platform?: string;
  };
}

/** Default consent — everything denied. Used when profile lookup fails. */
export const DEFAULT_CONSENT: UserEvalContext['consent'] = {
  marketing: false,
  push: false,
  sms: false,
  whatsapp: false,
  email: false,
  locationTracking: false,
  pdplOptOut: false,
};

@Injectable()
export class UserProfileClient extends BaseClient {
  constructor() {
    super(
      `${process.env.SEGMENTATION_SERVICE_URL || 'http://localhost:3004'}/api/v1`,
      'UserProfileClient',
      parseInt(process.env.SEGMENTATION_SERVICE_TIMEOUT || '3000')
    );
  }

  /**
   * Fetch the lightweight eval context for a user.
   * On any failure the caller falls back to empty segments + default consent
   * so campaign evaluation degrades gracefully (never hard-fails a delivery).
   */
  async getEvalContext(userId: string, tenantId: string): Promise<ServiceResponse<UserEvalContext>> {
    return this.request<UserEvalContext>(
      {
        method: 'GET',
        url: `/users/${userId}`,
        headers: {
          'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN || ''}`,
        },
      },
      tenantId
    );
  }
}
