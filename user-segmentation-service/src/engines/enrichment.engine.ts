import { IUserProfile } from '../models/user.model';
import { SegmentRule } from '../models/segment.model';
import { UserEnrichment } from '../models/user-enrichment.model';

/**
 * EnrichmentEngine — evaluates segment rules whose field path starts with "enrichment."
 *
 * These rules target attributes loaded from external sources (CSV uploads, CRM webhooks,
 * loyalty APIs, etc.) stored in the UserEnrichment collection.
 *
 * Example rules:
 *   { field: "enrichment.loyaltyTier",   operator: "in",           value: ["gold","platinum"] }
 *   { field: "enrichment.lifetimeValue", operator: "greater_than", value: 3000 }
 *   { field: "enrichment.crmTag",        operator: "equals",       value: "vip_2024" }
 *
 * Resolution strategy:
 *   1. Load all UserEnrichment documents for the user.
 *   2. For the requested attribute name, skip expired entries (expiresAt < now).
 *   3. Among valid entries, take the value from the most recently-uploaded document.
 *   4. Apply the operator against that value.
 *   5. If no valid value exists → rule does NOT match (false), consistent with the
 *      "only block on positive mismatch" principle everywhere else in the engine.
 */
export class EnrichmentEngine {

  async evaluate(user: IUserProfile, rule: SegmentRule): Promise<boolean> {
    // Extract attribute name: "enrichment.loyaltyTier" → "loyaltyTier"
    const attrName = rule.field.replace(/^enrichment\./, '');
    if (!attrName) return false;

    const value = await this.resolveAttribute(user.tenantId, user.userId, attrName);

    // No valid enrichment value → pass through rather than hard-block.
    // This matches the tolerant evaluation contract used across all engines.
    if (value === undefined) return false;

    return this.applyOperator(value, rule.operator, rule.value);
  }

  /**
   * Fetch all UserEnrichment records for the user, find the most recently uploaded
   * non-expired value for `attrName`, and return it (or undefined if none).
   */
  private async resolveAttribute(
    tenantId: string,
    userId: string,
    attrName: string
  ): Promise<any> {
    const now = new Date();

    // Fetch all enrichments for this user, sorted newest first
    const enrichments = await UserEnrichment.find({ tenantId, userId })
      .sort({ uploadedAt: -1 })
      .lean();

    for (const doc of enrichments) {
      const attrMap: Record<string, any> =
        doc.attributes instanceof Map
          ? Object.fromEntries(doc.attributes as Map<string, any>)
          : (doc.attributes as any) ?? {};

      const attr = attrMap[attrName];
      if (!attr) continue;

      // Skip if expired
      if (attr.expiresAt && new Date(attr.expiresAt) < now) continue;

      return attr.value;
    }

    return undefined;
  }

  // ── Operator dispatch ──────────────────────────────────────────────────────

  private applyOperator(fieldVal: any, operator: string, ruleVal: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldVal === ruleVal;
      case 'not_equals':
        return fieldVal !== ruleVal;
      case 'in':
        return Array.isArray(ruleVal) && ruleVal.includes(fieldVal);
      case 'not_in':
        return Array.isArray(ruleVal) && !ruleVal.includes(fieldVal);
      case 'greater_than':
        return this.compareNumbers(fieldVal, ruleVal, '>');
      case 'less_than':
        return this.compareNumbers(fieldVal, ruleVal, '<');
      case 'between':
        if (!Array.isArray(ruleVal) || ruleVal.length !== 2) return false;
        return (
          this.compareNumbers(fieldVal, ruleVal[0], '>=') &&
          this.compareNumbers(fieldVal, ruleVal[1], '<=')
        );
      case 'contains':
        if (typeof fieldVal === 'string') return fieldVal.includes(String(ruleVal));
        if (Array.isArray(fieldVal)) return fieldVal.includes(ruleVal);
        return false;
      case 'not_contains':
        if (typeof fieldVal === 'string') return !fieldVal.includes(String(ruleVal));
        if (Array.isArray(fieldVal)) return !fieldVal.includes(ruleVal);
        return false;
      case 'exists':
        return fieldVal !== undefined && fieldVal !== null;
      case 'not_exists':
        return fieldVal === undefined || fieldVal === null;
      case 'starts_with':
        return typeof fieldVal === 'string' && fieldVal.startsWith(String(ruleVal));
      case 'ends_with':
        return typeof fieldVal === 'string' && fieldVal.endsWith(String(ruleVal));
      default:
        return false;
    }
  }

  private compareNumbers(a: any, b: any, op: '>' | '<' | '>=' | '<='): boolean {
    const na = Number(a);
    const nb = Number(b);
    if (isNaN(na) || isNaN(nb)) return false;
    switch (op) {
      case '>':  return na > nb;
      case '<':  return na < nb;
      case '>=': return na >= nb;
      case '<=': return na <= nb;
    }
  }
}
