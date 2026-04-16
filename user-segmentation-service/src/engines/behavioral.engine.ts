import { IUserProfile } from '../models/user.model';
import { SegmentRule } from '../models/segment.model';
import { addDays, isAfter, isBefore, differenceInDays } from 'date-fns';

export class BehavioralEngine {
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
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      case 'date_after':
        return this.isDateAfter(value, rule.value);
      case 'date_before':
        return this.isDateBefore(value, rule.value);
      case 'days_ago':
        return this.isDaysAgo(value, rule.value);
      default:
        return false;
    }
  }

  private getValueFromUser(user: IUserProfile, field: string): any {
    const fieldMap: Record<string, any> = {
      'behavioral.totalSessions': user.behavioral.totalSessions,
      'behavioral.lastSession': user.behavioral.lastSession,
      'behavioral.sessionDuration': user.behavioral.sessionDuration,
      'behavioral.pagesViewed': user.behavioral.pagesViewed,
      'behavioral.purchaseCount': user.behavioral.purchaseCount,
      'behavioral.totalSpent': user.behavioral.totalSpent,
      'behavioral.averageOrderValue': user.behavioral.averageOrderValue,
      'behavioral.lastPurchaseDate': user.behavioral.lastPurchaseDate,
      'behavioral.engagementScore': user.behavioral.engagementScore,
      'behavioral.churnRisk': user.behavioral.churnRisk,
      'behavioral.lifetimeValue': user.behavioral.lifetimeValue,
      'behavioral.favoriteCategories': user.behavioral.favoriteCategories,
      'metadata.lastActivity': user.metadata.lastActivity,
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
    if (Array.isArray(container)) {
      return container.includes(value);
    }
    return false;
  }

  private isDateAfter(date: any, reference: any): boolean {
    if (!(date instanceof Date) || !(reference instanceof Date)) return false;
    return isAfter(date, reference);
  }

  private isDateBefore(date: any, reference: any): boolean {
    if (!(date instanceof Date) || !(reference instanceof Date)) return false;
    return isBefore(date, reference);
  }

  private isDaysAgo(date: any, days: number): boolean {
    if (!(date instanceof Date) || typeof days !== 'number') return false;
    
    const cutoffDate = addDays(new Date(), -days);
    return isAfter(date, cutoffDate);
  }

  // Special behavioral evaluations
  isHighValueCustomer(user: IUserProfile): boolean {
    return user.behavioral.lifetimeValue > 1000 && 
           user.behavioral.purchaseCount > 5 &&
           user.behavioral.engagementScore > 70;
  }

  isAtRiskChurn(user: IUserProfile): boolean {
    const daysSinceLastActivity = differenceInDays(new Date(), user.metadata.lastActivity);
    return user.behavioral.churnRisk > 70 || daysSinceLastActivity > 30;
  }

  isNewActiveUser(user: IUserProfile): boolean {
    const daysSinceCreation = differenceInDays(new Date(), user.createdAt);
    return user.metadata.isNewUser && 
           daysSinceCreation <= 7 && 
           user.behavioral.totalSessions > 3;
  }
}