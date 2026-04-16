import { Template, ITemplate } from '../models/template.model';
import { redisClient } from '../cache/redis.client';
import { logger } from '../utils/logger';
import Handlebars from 'handlebars';
import htmlToText from 'html-to-text';

export class TemplateService {
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  async createTemplate(templateData: Partial<ITemplate>): Promise<ITemplate> {
    // Validate template variables against content
    this.validateTemplate(templateData);

    const template = new Template(templateData);
    await template.save();

    // Clear template cache
    await this.clearTemplateCache(template.tenantId);

    logger.info('Template created', {
      templateId: template._id,
      tenantId: template.tenantId,
      type: template.type
    });

    return template;
  }

  async getTemplate(tenantId: string, templateId: string): Promise<ITemplate | null> {
    const cacheKey = `template:${templateId}`;
    
    const cachedTemplate = await redisClient.getForTenant<ITemplate>(tenantId, cacheKey);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    const template = await Template.findOne({ _id: templateId, tenantId });
    if (template) {
      await redisClient.setForTenant(tenantId, cacheKey, template, 600); // Cache for 10 minutes
    }

    return template;
  }

  async getTemplatesByType(tenantId: string, type: string): Promise<ITemplate[]> {
    const cacheKey = `templates:${type}`;
    
    const cachedTemplates = await redisClient.getForTenant<ITemplate[]>(tenantId, cacheKey);
    if (cachedTemplates) {
      return cachedTemplates;
    }

    const templates = await Template.find({
      tenantId,
      type,
      isActive: true
    }).sort({ name: 1 }).lean();

    await redisClient.setForTenant(tenantId, cacheKey, templates, 300); // Cache for 5 minutes

    return templates;
  }

  renderTemplate(template: ITemplate, data: Record<string, any>): any {
    const cacheKey = `${template._id}:${template.version}`;
    
    // Get compiled template from cache or compile it
    let compiledTemplate = this.templateCache.get(cacheKey);
    if (!compiledTemplate) {
      compiledTemplate = Handlebars.compile(template.content.html);
      this.templateCache.set(cacheKey, compiledTemplate);
    }

    // Validate data against template variables
    this.validateTemplateData(template, data);

    const renderedHtml = compiledTemplate(data);
    const renderedText = htmlToText.convert(renderedHtml, {
      wordwrap: 80,
      ignoreImage: true
    });

    return {
      subject: this.renderString(template.subject, data),
      title: template.content.title ? this.renderString(template.content.title, data) : undefined,
      body: renderedText,
      html: renderedHtml,
      preheader: template.content.preheader ? this.renderString(template.content.preheader, data) : undefined
    };
  }

  private renderString(template: string, data: Record<string, any>): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }

  private validateTemplate(template: Partial<ITemplate>): void {
    if (!template.content?.html) {
      throw new Error('Template HTML content is required');
    }

    if (!template.content?.text) {
      throw new Error('Template text content is required');
    }

    // Test compilation
    try {
      Handlebars.compile(template.content.html);
      Handlebars.compile(template.subject);
    } catch (error) {
      throw new Error(`Invalid template syntax: ${error.message}`);
    }

    // Validate variables in content match defined variables
    const htmlVariables = this.extractVariables(template.content.html);
    const subjectVariables = this.extractVariables(template.subject);
    const allVariables = new Set([...htmlVariables, ...subjectVariables]);

    const definedVariables = new Set(template.variables?.map(v => v.name) || []);

    const undefinedVariables = Array.from(allVariables).filter(v => !definedVariables.has(v));
    if (undefinedVariables.length > 0) {
      throw new Error(`Undefined variables in template: ${undefinedVariables.join(', ')}`);
    }
  }

  private validateTemplateData(template: ITemplate, data: Record<string, any>): void {
    for (const variable of template.variables) {
      if (variable.required && !(variable.name in data)) {
        throw new Error(`Required variable missing: ${variable.name}`);
      }

      if (variable.name in data) {
        this.validateVariableType(variable, data[variable.name]);
      }
    }
  }

  private validateVariableType(variable: any, value: any): void {
    switch (variable.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Variable ${variable.name} must be a string`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Variable ${variable.name} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Variable ${variable.name} must be a boolean`);
        }
        break;
      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          throw new Error(`Variable ${variable.name} must be a valid date`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Variable ${variable.name} must be an array`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error(`Variable ${variable.name} must be an object`);
        }
        break;
    }
  }

  private extractVariables(template: string): string[] {
    const variableRegex = /\{\{([^{}]+)\}\}/g;
    const matches = template.match(variableRegex) || [];
    return matches.map(match => match.replace(/\{\{|\}\}/g, '').trim());
  }

  private async clearTemplateCache(tenantId: string): Promise<void> {
    const pattern = `template:*`;
    await redisClient.clearTenantCache(tenantId);
    
    // Also clear in-memory cache for this tenant's templates
    for (const [key] of this.templateCache) {
      if (key.startsWith(tenantId)) {
        this.templateCache.delete(key);
      }
    }
  }

  async updateTemplate(
    templateId: string, 
    tenantId: string, 
    updates: Partial<ITemplate>
  ): Promise<ITemplate | null> {
    if (updates.content || updates.subject) {
      this.validateTemplate(updates);
    }

    const template = await Template.findOneAndUpdate(
      { _id: templateId, tenantId },
      { ...updates, version: { $inc: 1 } },
      { new: true }
    );

    if (template) {
      await this.clearTemplateCache(tenantId);
    }

    return template;
  }

  async deleteTemplate(templateId: string, tenantId: string): Promise<boolean> {
    const result = await Template.findOneAndDelete({ _id: templateId, tenantId });
    
    if (result) {
      await this.clearTemplateCache(tenantId);
      return true;
    }

    return false;
  }
}