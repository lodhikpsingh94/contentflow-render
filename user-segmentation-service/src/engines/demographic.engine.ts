import { IUserProfile } from '../models/user.model';
import { SegmentRule } from '../models/segment.model';

export class DemographicEngine {
  evaluate(user: IUserProfile, rule: SegmentRule): boolean {
    const value = this.getValueFromUser(user, rule.field);
    
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'greater_than':
        return this.compareNumbers(value, rule.value, 'greater');
      case 'less_than':
        return this.compareNumbers(value, rule.value, 'less');
      case 'between':
        return this.isBetween(value, rule.value);
      case 'in':
        return this.isInArray(value, rule.value);
      case 'not_in':
        return !this.isInArray(value, rule.value);
      case 'contains':
        return this.containsValue(value, rule.value);
      case 'not_contains':
        return !this.containsValue(value, rule.value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      case 'starts_with':
        return this.startsWith(value, rule.value);
      case 'ends_with':
        return this.endsWith(value, rule.value);
      default:
        return false;
    }
  }

  private getValueFromUser(user: IUserProfile, field: string): any {
    const fieldMap: Record<string, any> = {
      'demographic.age': user.demographic.age,
      'demographic.gender': user.demographic.gender,
      'demographic.country': user.demographic.country,
      'demographic.city': user.demographic.city,
      'demographic.region': user.demographic.region,
      'demographic.language': user.demographic.language,
      'demographic.timezone': user.demographic.timezone,
      'demographic.subscriptionTier': user.demographic.subscriptionTier,
      'demographic.accountAgeDays': user.demographic.accountAgeDays,
      'metadata.isActive': user.metadata.isActive,
      'metadata.isPremium': user.metadata.isPremium,
      'metadata.isNewUser': user.metadata.isNewUser,
      'metadata.acquisitionSource': user.metadata.acquisitionSource,
    };

    return fieldMap[field] ?? undefined;
  }

  private compareNumbers(a: any, b: any, operation: 'greater' | 'less'): boolean {
    const numA = Number(a);
    const numB = Number(b);
    
    if (isNaN(numA) || isNaN(numB)) return false;
    
    return operation === 'greater' ? numA > numB : numA < numB;
  }

  private isBetween(value: any, range: [number, number]): boolean {
    const numValue = Number(value);
    if (isNaN(numValue) || !Array.isArray(range) || range.length !== 2) {
      return false;
    }
    
    return numValue >= range[0] && numValue <= range[1];
  }

  private isInArray(value: any, array: any[]): boolean {
    if (!Array.isArray(array)) return false;
    return array.includes(value);
  }

  private containsValue(container: any, value: any): boolean {
    if (typeof container === 'string' && typeof value === 'string') {
      return container.includes(value);
    }
    if (Array.isArray(container)) {
      return container.includes(value);
    }
    return false;
  }

  private startsWith(str: any, prefix: any): boolean {
    if (typeof str !== 'string' || typeof prefix !== 'string') return false;
    return str.startsWith(prefix);
  }

  private endsWith(str: any, suffix: any): boolean {
    if (typeof str !== 'string' || typeof suffix !== 'string') return false;
    return str.endsWith(suffix);
  }
}