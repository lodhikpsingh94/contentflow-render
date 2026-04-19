import { Injectable } from '@nestjs/common';
import { BaseClient } from './base.client';
import { ServiceResponse } from '../models/shared/common.types';

@Injectable()
export class JourneyClient extends BaseClient {
  constructor() {
    super(
      `${process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3001'}/api/v1`,
      'JourneyClient',
      parseInt(process.env.CAMPAIGN_SERVICE_TIMEOUT || '10000'),
    );
  }

  private get serviceAuthHeader(): { Authorization: string } {
    const token = process.env.INTERNAL_SERVICE_TOKEN;
    if (!token) {
      this.logger.warn('INTERNAL_SERVICE_TOKEN is not set — journey service calls may be rejected');
    }
    return { Authorization: `Bearer ${token || ''}` };
  }

  async getJourneys(tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'GET', url: '/journeys' }, tenantId, this.serviceAuthHeader);
  }

  async getJourneyById(id: string, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'GET', url: `/journeys/${id}` }, tenantId, this.serviceAuthHeader);
  }

  async createJourney(data: any, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'POST', url: '/journeys', data }, tenantId, this.serviceAuthHeader);
  }

  async updateJourney(id: string, data: any, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'PUT', url: `/journeys/${id}`, data }, tenantId, this.serviceAuthHeader);
  }

  async updateJourneyStatus(id: string, status: string, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'PATCH', url: `/journeys/${id}/status`, data: { status } }, tenantId, this.serviceAuthHeader);
  }

  async deleteJourney(id: string, tenantId: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'DELETE', url: `/journeys/${id}` }, tenantId, this.serviceAuthHeader);
  }
}
