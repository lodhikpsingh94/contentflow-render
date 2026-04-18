// src/lib/segments/types.ts

export interface SegmentRule {
  field: string;
  operator: string;
  value: any;
}

export interface Segment {
  _id: string;
  name: string;
  description?: string;
  rules: SegmentRule[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export type NewSegmentData = Omit<Segment, '_id' | 'userCount' | 'createdAt' | 'updatedAt'> & {
  logicalOperator?: 'AND' | 'OR';
};

export interface AudienceEstimateBreakdown {
  field: string;
  operator: string;
  value: any;
  matchCount: number;
}

export interface AudienceEstimate {
  estimatedCount: number;
  totalUsers: number;
  percentage: number;
  breakdown: AudienceEstimateBreakdown[];
}