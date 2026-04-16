// C:\...\api-service\src\types\express.d.ts

import { TenantContext } from '../models/shared/tenant.types';

declare global {
  namespace Express {
    export interface Request {
      tenantContext?: TenantContext;
    }
  }
}