import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { GetContentRequest } from '../models/request/get-content.request';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ValidationMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    // Only validate specific routes
    if (req.method === 'POST' && req.path.includes('/content/deliver')) {
      await this.validateContentRequest(req, res, next);
    } else {
      next();
    }
  }

  private async validateContentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const contentRequest = plainToClass(GetContentRequest, req.body);
      const errors = await validate(contentRequest, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false }
      });

      if (errors.length > 0) {
        const errorMessages = this.formatValidationErrors(errors);
        
        this.logger.warn(`Validation failed: ${JSON.stringify(errorMessages)}`);
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            timestamp: new Date(),
            details: errorMessages
          }
        });
      }

      // Replace body with validated instance
      req.body = contentRequest;
      next();
    } catch (error:any) {
      this.logger.error(`Validation middleware error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Validation processing failed',
          code: 'VALIDATION_PROCESSING_ERROR',
          timestamp: new Date()
        }
      });
    }
  }

  private formatValidationErrors(errors: any[]): string[] {
    return errors.flatMap(error => {
      if (error.children && error.children.length > 0) {
        return this.formatValidationErrors(error.children);
      }
      return Object.values(error.constraints || {});
    });
  }
}