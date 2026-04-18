import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { SMTPConfig, SendGridConfig, MailgunConfig } from '../models/channel.model';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  providerResponse?: any;
  error?: string;
}

export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<EmailResult>;
  abstract validateConfig(config: any): boolean;
}

export class SMTPProvider extends EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(private config: SMTPConfig) {
    super();
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: message.from || this.config.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        providerResponse: result
      };
    } catch (error:any) {
      logger.error('SMTP send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateConfig(config: SMTPConfig): boolean {
    return !!(config.host && config.port && config.auth?.user && config.auth?.pass);
  }
}

export class SendGridProvider extends EmailProvider {
  constructor(private config: SendGridConfig) {
    super();
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: message.to }],
            cc: message.cc?.map(email => ({ email })),
            bcc: message.bcc?.map(email => ({ email }))
          }],
          from: { email: message.from || this.config.from },
          subject: message.subject,
          content: [
            { type: 'text/plain', value: message.text },
            { type: 'text/html', value: message.html }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          messageId: data.id,
          providerResponse: data
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `SendGrid error: ${response.status} - ${error}`
        };
      }
    } catch (error:any) {
      logger.error('SendGrid send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateConfig(config: SendGridConfig): boolean {
    return !!(config.apiKey && config.from);
  }
}

export class MailgunProvider extends EmailProvider {
  constructor(private config: MailgunConfig) {
    super();
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const formData = new FormData();
      formData.append('from', message.from || this.config.from);
      formData.append('to', message.to);
      formData.append('subject', message.subject);
      formData.append('text', message.text);
      formData.append('html', message.html);
      
      if (message.replyTo) formData.append('h:Reply-To', message.replyTo);
      if (message.cc) message.cc.forEach(cc => formData.append('cc', cc));
      if (message.bcc) message.bcc.forEach(bcc => formData.append('bcc', bcc));

      const response = await fetch(
        `https://api.mailgun.net/v3/${this.config.domain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          messageId: data.id,
          providerResponse: data
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `Mailgun error: ${response.status} - ${error}`
        };
      }
    } catch (error:any) {
      logger.error('Mailgun send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateConfig(config: MailgunConfig): boolean {
    return !!(config.apiKey && config.domain && config.from);
  }
}

export class EmailProviderFactory {
  static createProvider(type: string, config: any): EmailProvider {
    switch (type) {
      case 'smtp':
        return new SMTPProvider(config);
      case 'sendgrid':
        return new SendGridProvider(config);
      case 'mailgun':
        return new MailgunProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${type}`);
    }
  }
}