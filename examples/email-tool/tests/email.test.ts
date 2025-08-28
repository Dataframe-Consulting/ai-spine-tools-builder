/**
 * Email Tool Tests
 * 
 * Comprehensive tests for email tool functionality including:
 * - Input validation (email addresses, attachments, etc.)
 * - SendGrid integration
 * - Error handling
 * - Rate limiting
 * - Template functionality
 * - Attachment handling
 */

import { testTool } from '@ai-spine/tools-testing';
import sgMail from '@sendgrid/mail';
import emailTool from '../src/index';

// Mock SendGrid
jest.mock('@sendgrid/mail');
const mockedSgMail = sgMail as jest.Mocked<typeof sgMail>;

describe('Email Tool', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    
    // Default mock implementation for successful email send
    mockedSgMail.send.mockResolvedValue([
      {
        statusCode: 202,
        body: '',
        headers: {
          'x-message-id': 'test-message-id-123',
        },
      },
      {},
    ]);
    
    mockedSgMail.setApiKey.mockImplementation(() => {});
  });

  describe('Input Validation', () => {
    const baseConfig = {
      apiKey: 'SG.test-key',
      fromEmail: 'sender@example.com',
    };

    it('should validate required fields', async () => {
      const result = await testTool(emailTool, {
        input: {},
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });

    it('should validate recipient email addresses', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['valid@example.com', 'invalid-email'],
          subject: 'Test Subject',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_RECIPIENTS');
      expect(result.error?.details?.invalidEmails).toContain('invalid-email');
    });

    it('should validate CC email addresses', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['valid@example.com'],
          cc: ['invalid-cc-email'],
          subject: 'Test Subject',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_CC_RECIPIENTS');
    });

    it('should validate BCC email addresses', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['valid@example.com'],
          bcc: ['invalid-bcc-email'],
          subject: 'Test Subject',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_BCC_RECIPIENTS');
    });

    it('should validate sender email in config', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          content: 'Test content',
        },
        config: {
          apiKey: 'SG.test-key',
          fromEmail: 'invalid-sender-email',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_SENDER_EMAIL');
    });

    it('should validate subject length', async () => {
      const longSubject = 'x'.repeat(1000); // Exceeds 998 char limit
      
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: longSubject,
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });

    it('should require API key in config', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test',
          content: 'Test content',
        },
        config: {
          fromEmail: 'sender@example.com',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });
  });

  describe('Successful Email Sending', () => {
    const baseConfig = {
      apiKey: 'SG.test-key',
      fromEmail: 'sender@example.com',
      fromName: 'Test Sender',
    };

    it('should send basic text email', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          content: 'This is a test email',
          contentType: 'text',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.messageId).toBe('test-message-id-123');
      expect(result.data?.recipients.to).toEqual(['recipient@example.com']);
      expect(result.data?.subject).toBe('Test Subject');

      expect(mockedSgMail.setApiKey).toHaveBeenCalledWith('SG.test-key');
      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          text: 'This is a test email',
          from: {
            email: 'sender@example.com',
            name: 'Test Sender',
          },
        })
      );
    });

    it('should send HTML email', async () => {
      const htmlContent = '<h1>Hello</h1><p>This is an HTML email</p>';
      
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'HTML Test',
          content: htmlContent,
          contentType: 'html',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: htmlContent,
        })
      );
    });

    it('should handle multiple recipients', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient1@example.com', 'recipient2@example.com'],
          subject: 'Test Subject',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.recipients.to).toHaveLength(2);
      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['recipient1@example.com', 'recipient2@example.com'],
        })
      );
    });

    it('should handle CC and BCC recipients', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
          subject: 'Test Subject',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.recipients.cc).toEqual(['cc@example.com']);
      expect(result.data?.recipients.bcc).toBe(1); // Count only for privacy
      
      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: ['cc@example.com'],
          bcc: ['bcc@example.com'],
        })
      );
    });

    it('should handle email priority', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'High Priority',
          content: 'Urgent message',
          priority: 'high',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'X-Priority': '5',
          },
        })
      );
    });

    it('should handle tracking settings', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Tracked Email',
          content: 'This email is tracked',
          trackOpens: true,
          trackClicks: true,
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.deliveryInfo.trackingEnabled).toEqual({
        opens: true,
        clicks: true,
      });

      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingSettings: expect.objectContaining({
            openTracking: { enable: true },
            clickTracking: { enable: true },
          }),
        })
      );
    });

    it('should handle template emails', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Template Email',
          content: 'This will be ignored when using templates',
          templateId: 'd-1234567890abcdef',
          templateData: {
            name: 'John Doe',
            product: 'AI Spine Tools',
          },
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.deliveryInfo.templateUsed).toBe(true);
      expect(result.data?.deliveryInfo.templateId).toBe('d-1234567890abcdef');

      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'd-1234567890abcdef',
          dynamicTemplateData: {
            name: 'John Doe',
            product: 'AI Spine Tools',
          },
        })
      );
    });

    it('should include proper metadata', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.metadata).toMatchObject({
        executionId: expect.any(String),
        timestamp: expect.any(String),
        toolVersion: '1.0.0',
      });

      expect(result.data?.deliveryInfo).toMatchObject({
        provider: 'SendGrid',
        sandboxMode: false,
        templateUsed: false,
      });

      expect(result.timing).toMatchObject({
        executionTimeMs: expect.any(Number),
        startedAt: expect.any(String),
        completedAt: expect.any(String),
      });
    });
  });

  describe('Attachment Handling', () => {
    const baseConfig = {
      apiKey: 'SG.test-key',
      fromEmail: 'sender@example.com',
    };

    const sampleAttachment = {
      filename: 'test.txt',
      content: Buffer.from('Hello World').toString('base64'),
      type: 'text/plain',
    };

    it('should handle email with attachments', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Email with Attachment',
          content: 'Please see attached file',
          attachments: [sampleAttachment],
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.attachments).toHaveLength(1);
      expect(result.data?.attachments[0]).toMatchObject({
        filename: 'test.txt',
        type: 'text/plain',
        size: expect.any(Number),
      });

      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              filename: 'test.txt',
              content: sampleAttachment.content,
              type: 'text/plain',
              disposition: 'attachment',
            }),
          ],
        })
      );
    });

    it('should validate attachment size limits', async () => {
      const largeAttachment = {
        filename: 'large.txt',
        content: 'x'.repeat(1000000), // Large content
        type: 'text/plain',
      };

      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Email with Large Attachment',
          content: 'Test',
          attachments: [largeAttachment],
        },
        config: {
          ...baseConfig,
          maxAttachmentSize: 1024, // 1KB limit
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_ATTACHMENT');
      expect(result.error?.message).toContain('exceeds size limit');
    });

    it('should validate allowed attachment types', async () => {
      const disallowedAttachment = {
        filename: 'script.exe',
        content: Buffer.from('executable').toString('base64'),
        type: 'application/exe',
      };

      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Email with Disallowed Attachment',
          content: 'Test',
          attachments: [disallowedAttachment],
        },
        config: {
          ...baseConfig,
          allowedAttachmentTypes: ['pdf', 'txt', 'jpg'],
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_ATTACHMENT');
      expect(result.error?.message).toContain('Attachment type not allowed');
    });

    it('should require filename and content for attachments', async () => {
      const invalidAttachment = {
        filename: 'test.txt',
        // Missing content
      };

      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Email with Invalid Attachment',
          content: 'Test',
          attachments: [invalidAttachment as any],
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_ATTACHMENT');
      expect(result.error?.message).toContain('must have filename and content');
    });
  });

  describe('Rate Limiting', () => {
    const baseConfig = {
      apiKey: 'SG.test-key',
      fromEmail: 'sender@example.com',
      rateLimitPerHour: 2, // Very low limit for testing
    };

    it('should enforce rate limits', async () => {
      const emailInput = {
        to: ['recipient@example.com'],
        subject: 'Rate Limited Email',
        content: 'Test content',
      };

      // First two emails should succeed
      const result1 = await testTool(emailTool, {
        input: emailInput,
        config: baseConfig,
      });
      expect(result1.status).toBe('success');

      const result2 = await testTool(emailTool, {
        input: emailInput,
        config: baseConfig,
      });
      expect(result2.status).toBe('success');

      // Third email should be rate limited
      const result3 = await testTool(emailTool, {
        input: emailInput,
        config: baseConfig,
      });
      expect(result3.status).toBe('error');
      expect(result3.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result3.error?.details?.resetTime).toBeDefined();
    });

    it('should include rate limit info in successful responses', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('success');
      expect(result.data?.rateLimiting).toMatchObject({
        remaining: expect.any(Number),
        resetTime: expect.any(String),
      });
    });
  });

  describe('SendGrid Error Handling', () => {
    const baseConfig = {
      apiKey: 'SG.test-key',
      fromEmail: 'sender@example.com',
    };

    it('should handle invalid API key error', async () => {
      const sgError = {
        response: {
          status: 401,
          body: {
            errors: [{ message: 'The provided authorization grant is invalid' }],
          },
        },
        code: 401,
      };

      mockedSgMail.send.mockRejectedValueOnce(sgError);

      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_API_KEY');
      expect(result.error?.type).toBe('authentication_error');
    });

    it('should handle SendGrid validation errors', async () => {
      const sgError = {
        response: {
          body: {
            errors: [{ message: 'The from address does not match a verified Sender Identity' }],
          },
        },
      };

      mockedSgMail.send.mockRejectedValueOnce(sgError);

      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('SENDGRID_ERROR');
      expect(result.error?.message).toContain('from address does not match');
    });

    it('should handle generic network errors', async () => {
      const networkError = new Error('Network timeout');
      mockedSgMail.send.mockRejectedValueOnce(networkError);

      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Test',
          content: 'Test content',
        },
        config: baseConfig,
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('EMAIL_SEND_FAILED');
      expect(result.error?.message).toContain('Network timeout');
    });
  });

  describe('Configuration Options', () => {
    it('should handle sandbox mode', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['recipient@example.com'],
          subject: 'Sandbox Test',
          content: 'This is a test email',
        },
        config: {
          apiKey: 'SG.test-key',
          fromEmail: 'sender@example.com',
          enableSandboxMode: true,
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.deliveryInfo.sandboxMode).toBe(true);

      expect(mockedSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          mailSettings: {
            sandboxMode: { enable: true },
          },
        })
      );
    });

    it('should normalize and validate email addresses', async () => {
      const result = await testTool(emailTool, {
        input: {
          to: ['  RECIPIENT@EXAMPLE.COM  ', 'user@domain.org'],
          subject: 'Test',
          content: 'Test content',
        },
        config: {
          apiKey: 'SG.test-key',
          fromEmail: 'sender@example.com',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.recipients.to).toEqual([
        'recipient@example.com', // Normalized to lowercase and trimmed
        'user@domain.org',
      ]);
    });
  });
});