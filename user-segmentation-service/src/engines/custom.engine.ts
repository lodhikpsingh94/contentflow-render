import { IUserProfile } from '../models/user.model';
import { SegmentRule } from '../models/segment.model';

export class CustomEngine {
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
      case 'regex':
        return this.matchesRegex(value, rule.value);
      case 'not_regex':
        return !this.matchesRegex(value, rule.value);
      case 'json_path':
        return this.jsonPathMatches(value, rule.value);
      default:
        return false;
    }
  }

  private getValueFromUser(user: IUserProfile, field: string): any {
    // Handle custom attributes and nested fields
    if (field.startsWith('customAttributes.')) {
      const attributeName = field.replace('customAttributes.', '');
      return user.customAttributes.get(attributeName);
    }
    
    // Handle nested object paths
    const path = field.split('.');
    let value: any = user;
    
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private compareNumbers(a: any, b: any, operation: 'greater' | 'less'): boolean {
    const numA = Number(a);
    const numB = Number(b);
    
    if (isNaN(numA) || isNaN(numB)) return false;
    
    return operation === 'greater' ? numA > numB : numA < numB;
  }

  private matchesRegex(value: any, pattern: string): boolean {
    if (typeof value !== 'string') return false;
    
    try {
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch {
      return false;
    }
  }

  private jsonPathMatches(value: any, pathConfig: any): boolean {
    if (typeof value !== 'object' || value === null) return false;
    
    // Simple JSON path evaluation
    // For complex JSON path, consider using a library like JSONPath
    try {
      const { path, operator, expected } = pathConfig;
      const actualValue = this.getJsonValue(value, path);
      
      switch (operator) {
        case 'equals':
          return actualValue === expected;
        case 'contains':
          return typeof actualValue === 'string' && actualValue.includes(expected);
        case 'exists':
          return actualValue !== undefined;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private getJsonValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Advanced custom evaluations
  evaluateComplexRule(user: IUserProfile, rules: SegmentRule[], logicalOperator: 'AND' | 'OR' = 'AND'): boolean {
    if (logicalOperator === 'AND') {
      return rules.every(rule => this.evaluate(user, rule));
    } else {
      return rules.some(rule => this.evaluate(user, rule));
    }
  }

  evaluateWeightedRule(user: IUserProfile, rules: SegmentRule[], threshold: number = 0.5): boolean {
    let totalWeight = 0;
    let achievedWeight = 0;

    for (const rule of rules) {
      const weight = rule.weight || 1;
      totalWeight += weight;
      
      if (this.evaluate(user, rule)) {
        achievedWeight += weight;
      }
    }

    return totalWeight > 0 ? achievedWeight / totalWeight >= threshold : false;
  }
}