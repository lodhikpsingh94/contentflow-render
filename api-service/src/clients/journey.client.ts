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

  private authHeaders(authToken?: string) {
    return authToken ? { Authorization: authToken } : undefined;
  }

  async getJourneys(tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'GET', url: '/journeys' }, tenantId, this.authHeaders(authToken));
  }

  async getJourneyById(id: string, tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'GET', url: `/journeys/${id}` }, tenantId, this.authHeaders(authToken));
  }

  async createJourney(data: any, tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'POST', url: '/journeys', data }, tenantId, this.authHeaders(authToken));
  }

  async updateJourney(id: string, data: any, tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'PUT', url: `/journeys/${id}`, data }, tenantId, this.authHeaders(authToken));
  }

  async updateJourneyStatus(id: string, status: string, tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'PATCH', url: `/journeys/${id}/status`, data: { status } }, tenantId, this.authHeaders(authToken));
  }

  async deleteJourney(id: string, tenantId: string, authToken?: string): Promise<ServiceResponse<any>> {
    return this.request<any>({ method: 'DELETE', url: `/journeys/${id}` }, tenantId, this.authHeaders(authToken));
  }
}
