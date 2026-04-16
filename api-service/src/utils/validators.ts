import { 
  ValidatorConstraint, 
  ValidatorConstraintInterface, 
  ValidationArguments,
  registerDecorator,
  ValidationOptions 
} from 'class-validator';

@ValidatorConstraint({ name: 'isTenantId', async: false })
export class IsTenantIdConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // Tenant ID format validation: alphanumeric, hyphens, underscores, 3-50 chars
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{3,50}$/.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Tenant ID must be 3-50 characters long and contain only letters, numbers, hyphens, and underscores';
  }
}

@ValidatorConstraint({ name: 'isContentType', async: false })
export class IsContentTypeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const allowedTypes = ['banner', 'video', 'popup', 'notification'];
    return Array.isArray(value) ? value.every(type => allowedTypes.includes(type)) : allowedTypes.includes(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `Content type must be one of: ${['banner', 'video', 'popup', 'notification'].join(', ')}`;
  }
}

@ValidatorConstraint({ name: 'isDevicePlatform', async: false })
export class IsDevicePlatformConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const allowedPlatforms = ['ios', 'android', 'web'];
    return allowedPlatforms.includes(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `Device platform must be one of: ${['ios', 'android', 'web'].join(', ')}`;
  }
}

// Custom decorators
export function IsTenantId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTenantIdConstraint,
    });
  };
}

export function IsContentType(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsContentTypeConstraint,
    });
  };
}

export function IsDevicePlatform(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDevicePlatformConstraint,
    });
  };
}

export class ValidationUtils {
  static isValidTenantSlug(slug: string): boolean {
    return /^[a-z0-9-]{3,30}$/.test(slug);
  }

  static isValidUserId(userId: string): boolean {
    return typeof userId === 'string' && userId.length > 0 && userId.length <= 100;
  }

  static isValidDevicePlatform(platform: string): boolean {
    return ['ios', 'android', 'web'].includes(platform);
  }

  static validateTenantConfig(config: any): string[] {
    const errors: string[] = [];

    if (config.maxUsers && (config.maxUsers < 1 || config.maxUsers > 1000000)) {
      errors.push('maxUsers must be between 1 and 1000000');
    }

    if (config.maxCampaigns && (config.maxCampaigns < 1 || config.maxCampaigns > 10000)) {
      errors.push('maxCampaigns must be between 1 and 10000');
    }

    if (config.rateLimiting) {
      if (config.rateLimiting.requestsPerMinute < 1) {
        errors.push('requestsPerMinute must be at least 1');
      }
      if (config.rateLimiting.requestsPerHour < config.rateLimiting.requestsPerMinute) {
        errors.push('requestsPerHour must be greater than requestsPerMinute');
      }
    }

    if (config.caching) {
      if (config.caching.ttl < 0) {
        errors.push('cache TTL must be non-negative');
      }
      if (config.caching.maxSize < 0) {
        errors.push('cache maxSize must be non-negative');
      }
    }

    return errors;
  }

  static sanitizeUserInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }
}