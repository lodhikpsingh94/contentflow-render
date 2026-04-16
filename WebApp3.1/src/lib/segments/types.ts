// src/lib/segments/types.ts

// CORRECTED: This now matches the backend's 'SegmentRule' in segment.model.ts
export interface SegmentRule {
  field: string;
  operator: string;
  value: any;
}

// REMOVED: The recursive RuleGroup is not supported by the current backend.
// export interface RuleGroup { ... }

// CORRECTED: The Segment type now uses a flat array of rules.
export interface Segment {
  _id: string;
  name: string;
  description?: string;
  // The 'rules' property is now a flat array of rule objects
  rules: SegmentRule[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

// CORRECTED: The payload for creating a new segment
export type NewSegmentData = Omit<Segment, '_id' | 'userCount' | 'createdAt' | 'updatedAt'>;