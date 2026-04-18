/**
 * ABResolverService
 * ─────────────────
 * Deterministically assigns a user to a campaign variant using a stable hash
 * so the same user always sees the same variant (no flickering across sessions).
 *
 * Algorithm:
 *   hash = djb2(userId + campaignId)  — fast, low-collision, no crypto overhead
 *   bucket = hash % 100               — 0..99
 *   Walk variants in order, assign to first variant whose cumulative weight > bucket
 *
 * Example: variants = [{weight:60, id:'A'}, {weight:40, id:'B'}]
 *   User hash bucket 0–59  → 'A'
 *   User hash bucket 60–99 → 'B'
 */

import { ICampaign, CampaignVariant } from '../models/campaign.model';
import { logger } from '../utils/logger';

export interface VariantAssignment {
  variantId: string;
  variantName: string;
  isControl: boolean;    // first variant = control
}

export class ABResolverService {

  /**
   * Assign a user to a variant for a given campaign.
   * Returns null if the campaign has no variants (single-version campaign).
   */
  assignVariant(userId: string, campaign: ICampaign): VariantAssignment | null {
    if (!campaign.variants || campaign.variants.length === 0) return null;
    if (campaign.variants.length === 1) {
      const v = campaign.variants[0];
      return { variantId: v.id, variantName: v.name, isControl: true };
    }

    // If a winner has been declared, everyone sees the winner
    if (campaign.abTestWinnerVariantId) {
      const winner = campaign.variants.find(v => v.id === campaign.abTestWinnerVariantId);
      if (winner) {
        return { variantId: winner.id, variantName: winner.name, isControl: false };
      }
    }

    const bucket = this.hashBucket(userId, campaign._id.toString());
    let cumulative = 0;

    for (let i = 0; i < campaign.variants.length; i++) {
      const variant = campaign.variants[i];
      cumulative += variant.weight;
      if (bucket < cumulative) {
        return {
          variantId: variant.id,
          variantName: variant.name,
          isControl: i === 0,
        };
      }
    }

    // Fallback — should not happen if weights sum to 100
    const fallback = campaign.variants[0];
    logger.warn(`[ABResolver] Variant weights do not sum to 100 for campaign ${campaign._id}`);
    return { variantId: fallback.id, variantName: fallback.name, isControl: true };
  }

  /**
   * Get the content block for a specific variant + language preference.
   * Falls back: preferred language → Arabic → English → null
   */
  getVariantContent(
    variant: CampaignVariant,
    preferredLanguage: 'ar' | 'en' | string = 'ar'
  ): { content: any; language: string } | null {
    const lang = preferredLanguage as 'ar' | 'en';
    if (variant.content[lang]) {
      return { content: variant.content[lang], language: lang };
    }
    // Fallback chain: ar → en
    const fallback = lang === 'ar' ? 'en' : 'ar';
    if (variant.content[fallback]) {
      return { content: variant.content[fallback], language: fallback };
    }
    return null;
  }

  /**
   * Validate that a campaign's variant weights sum to exactly 100.
   */
  validateVariantWeights(campaign: ICampaign): { valid: boolean; error?: string } {
    if (!campaign.variants || campaign.variants.length === 0) {
      return { valid: true };
    }
    const total = campaign.variants.reduce((sum, v) => sum + (v.weight ?? 0), 0);
    if (total !== 100) {
      return { valid: false, error: `Variant weights sum to ${total}, must be exactly 100` };
    }
    return { valid: true };
  }

  // ── djb2 hash → 0..99 bucket ─────────────────────────────────────────────

  private hashBucket(userId: string, campaignId: string): number {
    const input = `${userId}::${campaignId}`;
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
      hash = hash >>> 0;   // keep as unsigned 32-bit
    }
    return hash % 100;
  }
}

export const abResolverService = new ABResolverService();
