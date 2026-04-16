import { Node, Edge } from 'reactflow';

// Specific data payloads for our custom nodes
export type TriggerNodeData = {
  triggerType: 'user_signup' | 'app_open' | 'custom_event';
  eventName?: string;
};

export type CampaignActionNodeData = {
  campaignId: string;
  campaignName?: string;
};

export type DelayNodeData = {
  duration: number;
  unit: 'minutes' | 'hours' | 'days';
};

// A union type for all possible node data structures
export type JourneyNodeData = TriggerNodeData | CampaignActionNodeData | DelayNodeData;

// The final Journey structure that will be saved to the database
export interface Journey {
  _id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  nodes: Node<JourneyNodeData>[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export type NewJourneyData = Omit<Journey, '_id' | 'createdAt' | 'updatedAt'>;