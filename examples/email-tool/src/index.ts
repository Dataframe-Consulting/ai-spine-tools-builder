import { createTool, stringField, arrayField, booleanField, objectField, apiKeyField } from '@ai-spine/tools';
import sgMail from '@sendgrid/mail';

// Define the input interface for type safety
interface EmailInput {
  to: string | string[];
  subject: string;
  content: {
    type: 'text' | 'html';
    value: string;
  };
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: string;
  }>;
  sendAt?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

// Define the configuration interface
interface EmailConfig {
  sendgrid_api_key: string;
  default_from_email: string;
  default_from_name?: string;
  sandbox_mode?: boolean;
  tracking?: {
    click_tracking?: boolean;
    open_tracking?: boolean;
    subscription_tracking?: boolean;
  };
}

// Create the email tool
const emailTool = createTool<EmailInput, EmailConfig>({
  metadata: {
    name: 'email-tool',
    version: '1.0.0',
    description: 'Send emails via SendGrid with support for templates, attachments, and scheduling',
    capabilities: ['email-sending', 'template-support', 'attachment-support', 'email-scheduling'],
    author: 'AI Spine Team',
    license: 'MIT',
    homepage: 'https://github.com/ai-spine/email-tool',
  },

  schema: {
    input: {
      to: {
        type: 'array',
        required: true,
        description: 'Recipient email addresses',
        items: stringField({
          required: true,
          format: 'email',
        }),
      },
      subject: stringField({
        required: true,
        description: 'Email subject line',
        minLength: 1,
        maxLength: 200,
      }),
      content: objectField({
        type: stringField({
          required: true,
          enum: ['text', 'html'],
          description: 'Content type',
        }),
        value: stringField({
          required: true,
          description: 'Email content',
          minLength: 1,
        }),
      }, {
        required: true,
        description: 'Email content object',
      }),
      from: stringField({
        required: false,
        description: 'Sender email address (overrides default)',
        format: 'email',
      }),
      cc: arrayField(
        stringField({ required: true, format: 'email' }),
        {
          required: false,
          description: 'CC recipients',
        }
      ),
      bcc: arrayField(
        stringField({ required: true, format: 'email' }),
        {
          required: false,
          description: 'BCC recipients',
        }
      ),
      attachments: arrayField(
        objectField({
          filename: stringField({ required: true }),
          content: stringField({ required: true, description: 'Base64 encoded content' }),
          type: stringField({ required: false, description: 'MIME type' }),
          disposition: stringField({ required: false, enum: ['attachment', 'inline'] }),
        }),
        {
          required: false,
          description: 'Email attachments',
        }
      ),
      sendAt: stringField({
        required: false,
        description: 'Schedule send time (ISO 8601 format)',
      }),
      templateId: stringField({
        required: false,
        description: 'SendGrid template ID',
      }),
      templateData: objectField({}, {
        required: false,
        description: 'Template variables',
      }),
    },

    config: {
      sendgrid_api_key: apiKeyField({
        required: true,
        description: 'SendGrid API key',
      }),
      default_from_email: {
        type: 'string',
        required: true,
        description: 'Default sender email address',
      },
      default_from_name: {
        type: 'string',
        required: false,
        description: 'Default sender name',
      },
      sandbox_mode: {
        type: 'boolean',
        required: false,
        description: 'Enable sandbox mode (emails won\'t be delivered)',
        default: false,
      },
      tracking: {
        type: 'object',
        required: false,
        description: 'Email tracking settings',
      },
    },
  },

  async execute(input, config, context) {
    console.log(`Sending email to: ${Array.isArray(input.to) ? input.to.join(', ') : input.to}`);

    try {
      // Initialize SendGrid
      sgMail.setApiKey(config.sendgrid_api_key);

      // Prepare email data
      const emailData: any = {
        to: Array.isArray(input.to) ? input.to : [input.to],
        from: {
          email: input.from || config.default_from_email,
          name: config.default_from_name || undefined,
        },
        subject: input.subject,
      };

      // Handle CC and BCC
      if (input.cc && input.cc.length > 0) {
        emailData.cc = input.cc;
      }

      if (input.bcc && input.bcc.length > 0) {
        emailData.bcc = input.bcc;
      }

      // Handle content
      if (input.templateId) {
        // Template email
        emailData.templateId = input.templateId;
        if (input.templateData) {
          emailData.dynamicTemplateData = input.templateData;
        }
      } else {
        // Regular email
        emailData.content = [{
          type: input.content.type === 'html' ? 'text/html' : 'text/plain',
          value: input.content.value,
        }];
      }

      // Handle attachments
      if (input.attachments && input.attachments.length > 0) {
        emailData.attachments = input.attachments.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content,
          type: attachment.type || 'application/octet-stream',
          disposition: attachment.disposition || 'attachment',
        }));
      }

      // Handle scheduled sending
      if (input.sendAt) {
        const sendAtTime = new Date(input.sendAt);
        if (sendAtTime <= new Date()) {
          throw new Error('Send time must be in the future');
        }
        emailData.sendAt = Math.floor(sendAtTime.getTime() / 1000);
      }

      // Configure tracking
      if (config.tracking) {
        emailData.trackingSettings = {
          clickTracking: {
            enable: config.tracking.click_tracking !== false,
          },
          openTracking: {
            enable: config.tracking.open_tracking !== false,
          },
          subscriptionTracking: {
            enable: config.tracking.subscription_tracking !== false,
          },
        };
      }

      // Configure sandbox mode
      if (config.sandbox_mode) {
        emailData.mailSettings = {
          sandboxMode: {
            enable: true,
          },
        };
      }

      // Send the email
      console.log('Sending email via SendGrid...');
      const startTime = Date.now();
      
      const response = await sgMail.send(emailData);
      
      const sendTime = Date.now() - startTime;

      // Process response
      const result = {
        success: true,
        message_id: response[0].headers['x-message-id'],
        recipients: {
          to: emailData.to,
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          total_count: emailData.to.length + (emailData.cc?.length || 0) + (emailData.bcc?.length || 0),
        },
        email_details: {
          subject: input.subject,
          from: emailData.from,
          content_type: input.templateId ? 'template' : input.content.type,
          template_id: input.templateId,
          has_attachments: (input.attachments?.length || 0) > 0,
          attachment_count: input.attachments?.length || 0,
          scheduled: !!input.sendAt,
          send_at: input.sendAt,
        },
        delivery_info: {
          status_code: response[0].statusCode,
          send_time_ms: sendTime,
          sandbox_mode: config.sandbox_mode || false,
          tracking_enabled: {
            click_tracking: config.tracking?.click_tracking !== false,
            open_tracking: config.tracking?.open_tracking !== false,
          },
        },
        metadata: {
          execution_id: context.execution_id,
          timestamp: context.timestamp.toISOString(),
          provider: 'SendGrid',
          tool_version: '1.0.0',
        },
      };

      console.log(`Email sent successfully! Message ID: ${result.message_id}`);

      return result;
    } catch (error) {
      console.error('Error sending email:', error);

      // Handle SendGrid specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as any;
        if (sgError.response?.body?.errors) {
          const errorMessages = sgError.response.body.errors.map((e: any) => e.message).join('; ');
          throw new Error(`SendGrid API error: ${errorMessages}`);
        }
      }

      // Handle common errors
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid SendGrid API key. Please check your configuration.');
        } else if (error.message.includes('Unauthorized')) {
          throw new Error('Unauthorized: Please verify your SendGrid API key has email sending permissions.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }

      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Start the tool server
async function main() {
  try {
    await emailTool.serve({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: process.env.HOST || '0.0.0.0',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      apiKeyAuth: process.env.API_KEY_AUTH === 'true',
      validApiKeys: process.env.VALID_API_KEYS?.split(','),
    });
  } catch (error) {
    console.error('Failed to start email tool server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down email tool gracefully...');
  await emailTool.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down email tool gracefully...');
  await emailTool.stop();
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  main();
}

export default emailTool;