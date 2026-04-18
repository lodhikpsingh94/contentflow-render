import { IUserProfile, ConsentData } from '../models/user.model';
import { SegmentRule } from '../models/segment.model';

/**
 * DeviceEngine — evaluates rules whose field prefix is:
 *   device.*     — platform, osVersion, appVersion, model, networkOperator, connectionType
 *   consent.*    — marketing, push, sms, whatsapp, email, locationTracking, pdplOptOut
 *   location.*   — geo_radius (requires user.demographic.coordinates)
 */
export class DeviceEngine {

  evaluate(user: IUserProfile, rule: SegmentRule): boolean {
    const { field, operator, value } = rule;

    if (field.startsWith('device.')) {
      return this.evaluateDeviceRule(user, field, operator, value);
    }
    if (field.startsWith('consent.')) {
      return this.evaluateConsentRule(user, field, operator, value);
    }
    if (field === 'location.geo_radius' || operator === 'geo_radius') {
      return this.evaluateGeoRadius(user, value);
    }

    return false;
  }

  // ── Device rules ─────────────────────────────────────────────────────────

  private evaluateDeviceRule(user: IUserProfile, field: string, operator: string, value: any): boolean {
    const deviceVal = this.getDeviceField(user, field);
    return this.applyOperator(deviceVal, operator, value);
  }

  private getDeviceField(user: IUserProfile, field: string): any {
    const device = user.device ?? {};
    const map: Record<string, any> = {
      'device.platform':        device.platform,
      'device.osVersion':       device.osVersion,
      'device.appVersion':      device.appVersion,
      'device.model':           device.model,
      'device.networkOperator': device.networkOperator,
      'device.connectionType':  device.connectionType,
    };
    return map[field] ?? undefined;
  }

  // ── Consent rules ─────────────────────────────────────────────────────────

  private evaluateConsentRule(user: IUserProfile, field: string, operator: string, value: any): boolean {
    const consent: ConsentData = user.consent ?? ({} as ConsentData);
    const map: Record<string, any> = {
      'consent.marketing':        consent.marketing,
      'consent.push':             consent.push,
      'consent.sms':              consent.sms,
      'consent.whatsapp':         consent.whatsapp,
      'consent.email':            consent.email,
      'consent.locationTracking': consent.locationTracking,
      'consent.pdplOptOut':       consent.pdplOptOut,
    };
    const consentVal = map[field] ?? undefined;

    // Boolean consent fields support 'equals' and shorthand 'is_true' / 'is_false'
    if (operator === 'equals' || operator === 'is_true') {
      const boolValue = typeof value === 'string' ? value === 'true' : Boolean(value);
      return consentVal === boolValue;
    }
    if (operator === 'is_false') return consentVal === false;
    return this.applyOperator(consentVal, operator, value);
  }

  // ── Geo radius rule (Haversine) ───────────────────────────────────────────

  /**
   * value must be: { lat: number; lng: number; radiusKm: number }
   * Matches if user.demographic.coordinates is within radiusKm of the given point.
   */
  private evaluateGeoRadius(user: IUserProfile, value: any): boolean {
    const coords = user.demographic?.coordinates;
    if (!coords?.lat || !coords?.lng) return false;
    if (!value?.lat || !value?.lng || !value?.radiusKm) return false;

    const dist = this.haversineKm(coords.lat, coords.lng, value.lat, value.lng);
    return dist <= value.radiusKm;
  }

  /**
   * Haversine formula — great-circle distance in kilometres.
   */
  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth mean radius (km)
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Shared operator dispatch ──────────────────────────────────────────────

  private applyOperator(fieldVal: any, operator: string, ruleVal: any): boolean {
    switch (operator) {
      case 'equals':       return fieldVal === ruleVal;
      case 'not_equals':   return fieldVal !== ruleVal;
      case 'contains':
        if (typeof fieldVal === 'string') return fieldVal.includes(String(ruleVal));
        if (Array.isArray(fieldVal))      return fieldVal.includes(ruleVal);
        return false;
      case 'not_contains':
        if (typeof fieldVal === 'string') return !fieldVal.includes(String(ruleVal));
        if (Array.isArray(fieldVal))      return !fieldVal.includes(ruleVal);
        return false;
      case 'starts_with':
        return typeof fieldVal === 'string' && fieldVal.startsWith(String(ruleVal));
      case 'in':
        return Array.isArray(ruleVal) && ruleVal.includes(fieldVal);
      case 'not_in':
        return Array.isArray(ruleVal) && !ruleVal.includes(fieldVal);
      case 'exists':
        return fieldVal !== undefined && fieldVal !== null;
      case 'not_exists':
        return fieldVal === undefined || fieldVal === null;
      case 'greater_than':
        return !isNaN(Number(fieldVal)) && !isNaN(Number(ruleVal)) && Number(fieldVal) > Number(ruleVal);
      case 'less_than':
        return !isNaN(Number(fieldVal)) && !isNaN(Number(ruleVal)) && Number(fieldVal) < Number(ruleVal);
      default:
        return false;
    }
  }
}
