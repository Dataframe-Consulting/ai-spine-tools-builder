# Email Tool Example

A comprehensive email tool example demonstrating the AI Spine Tools SDK with advanced email service integration using SendGrid.

## Features

- **SendGrid Integration**: Reliable email delivery with enterprise-grade service
- **File Attachments**: Support for multiple attachments with size and type validation
- **Template System**: Dynamic template support with variable substitution
- **Email Validation**: Comprehensive email address validation for recipients
- **Rate Limiting**: Built-in rate limiting to prevent spam and manage quotas
- **Tracking**: Optional open and click tracking for analytics
- **Multiple Recipients**: Support for TO, CC, and BCC recipients
- **HTML/Text Content**: Support for both HTML and plain text emails
- **Priority Levels**: Email priority support (low, normal, high)
- **Sandbox Mode**: Testing mode that doesn't send actual emails
- **Security**: Input sanitization and attachment validation

## Prerequisites

1. **Node.js 18+**: Required for running the tool
2. **SendGrid Account**: Get your free account at [SendGrid](https://sendgrid.com/)
3. **SendGrid API Key**: Create an API key with mail sending permissions

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configuration

Edit the `.env` file with your SendGrid credentials:

```env
SENDGRID_API_KEY=SG.your_actual_sendgrid_api_key_here
DEFAULT_FROM_EMAIL=your-verified-email@yourdomain.com
DEFAULT_FROM_NAME=Your App Name
PORT=3003
NODE_ENV=development
```

**Important**: The `DEFAULT_FROM_EMAIL` must be a verified sender in your SendGrid account.

### 3. Run the Tool

```bash
# Build and start
npm run build
npm start

# Or run in development mode with hot reload
npm run dev
```

The email tool will be available at:
- **API Endpoint**: `http://localhost:3003/api/execute`
- **Health Check**: `http://localhost:3003/health`
- **Schema Documentation**: `http://localhost:3003/schema`

## Usage Examples

### Basic Text Email

```bash
curl -X POST http://localhost:3003/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "to": ["recipient@example.com"],
      "subject": "Welcome to Our Service",
      "content": "Thank you for joining us!",
      "contentType": "text"
    },
    "config": {
      "apiKey": "SG.your_api_key_here",
      "fromEmail": "noreply@yourdomain.com",
      "fromName": "Your Service"
    }
  }'
```

### HTML Email with Multiple Recipients

```bash
curl -X POST http://localhost:3003/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "to": ["user1@example.com", "user2@example.com"],
      "cc": ["manager@example.com"],
      "subject": "Monthly Newsletter",
      "content": "<h1>Hello!</h1><p>Here is your <strong>monthly update</strong>.</p>",
      "contentType": "html",
      "trackOpens": true,
      "trackClicks": true
    },
    "config": {
      "apiKey": "SG.your_api_key_here",
      "fromEmail": "newsletter@yourdomain.com",
      "fromName": "Newsletter Team"
    }
  }'
```

### Email with Attachments

```bash
curl -X POST http://localhost:3003/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "to": ["client@example.com"],
      "subject": "Your Invoice",
      "content": "Please find your invoice attached.",
      "attachments": [
        {
          "filename": "invoice.pdf",
          "content": "base64_encoded_pdf_content_here",
          "type": "application/pdf"
        }
      ]
    },
    "config": {
      "apiKey": "SG.your_api_key_here",
      "fromEmail": "billing@yourdomain.com",
      "fromName": "Billing Department"
    }
  }'
```

### Template Email with Dynamic Data

```bash
curl -X POST http://localhost:3003/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "to": ["user@example.com"],
      "subject": "Welcome {{name}}!",
      "content": "This will be ignored when using templates",
      "templateId": "d-1234567890abcdef1234567890abcdef",
      "templateData": {
        "name": "John Doe",
        "company": "Acme Corp",
        "loginUrl": "https://app.example.com/login"
      }
    },
    "config": {
      "apiKey": "SG.your_api_key_here",
      "fromEmail": "welcome@yourdomain.com",
      "fromName": "Welcome Team"
    }
  }'
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "data": {
    "messageId": "msg_abc123def456",
    "recipients": {
      "to": ["recipient@example.com"],
      "cc": ["manager@example.com"],
      "bcc": 1
    },
    "subject": "Welcome to Our Service",
    "attachments": [
      {
        "filename": "document.pdf",
        "size": 1024000,
        "type": "application/pdf"
      }
    ],
    "deliveryInfo": {
      "provider": "SendGrid",
      "sandboxMode": false,
      "templateUsed": false,
      "templateId": null,
      "trackingEnabled": {
        "opens": true,
        "clicks": true
      }
    },
    "rateLimiting": {
      "remaining": 99,
      "resetTime": "2023-12-28T11:00:00.000Z"
    },
    "metadata": {
      "executionId": "exec_123456",
      "timestamp": "2023-12-28T10:15:30.000Z",
      "toolVersion": "1.0.0"
    }
  },
  "timing": {
    "executionTimeMs": 1245,
    "startedAt": "2023-12-28T10:15:30.000Z",
    "completedAt": "2023-12-28T10:15:31.245Z"
  }
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_RECIPIENTS",
    "message": "Invalid email addresses found: invalid-email, another-bad-email",
    "type": "validation_error",
    "details": {
      "invalidEmails": ["invalid-email", "another-bad-email"]
    }
  }
}
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `to` | array of strings | Yes | - | Recipient email addresses (1-100 recipients) |
| `subject` | string | Yes | - | Email subject line (max 998 characters) |
| `content` | string | Yes | - | Email body content (max 100,000 characters) |
| `contentType` | enum | No | `"text"` | Content type: `text` or `html` |
| `cc` | array of strings | No | `[]` | Carbon copy recipients (max 50) |
| `bcc` | array of strings | No | `[]` | Blind carbon copy recipients (max 50) |
| `attachments` | array of objects | No | `[]` | Email attachments (max 10) |
| `templateId` | string | No | - | SendGrid dynamic template ID |
| `templateData` | object | No | - | Dynamic template variables |
| `priority` | enum | No | `"normal"` | Email priority: `low`, `normal`, `high` |
| `trackOpens` | boolean | No | `false` | Enable open tracking |
| `trackClicks` | boolean | No | `false` | Enable click tracking |

### Attachment Object Structure

```json
{
  "filename": "document.pdf",
  "content": "base64_encoded_content",
  "type": "application/pdf",
  "disposition": "attachment"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `filename` | string | Yes | - | Name of the attachment file |
| `content` | string | Yes | - | Base64 encoded file content |
| `type` | string | No | `"application/octet-stream"` | MIME type of the file |
| `disposition` | enum | No | `"attachment"` | `attachment` or `inline` |

## Configuration Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `apiKey` | string | Yes | - | SendGrid API key with send permissions |
| `fromEmail` | string | Yes | - | Verified sender email address |
| `fromName` | string | No | - | Sender display name |
| `maxAttachmentSize` | number | No | `26214400` | Max attachment size in bytes (25MB) |
| `allowedAttachmentTypes` | array | No | - | Allowed file extensions/MIME types |
| `rateLimitPerHour` | number | No | `100` | Maximum emails per hour (1-10000) |
| `enableSandboxMode` | boolean | No | `false` | Enable sandbox mode for testing |
| `webhookUrl` | string | No | - | Webhook URL for delivery notifications |

## Error Codes

### Validation Errors
- **INVALID_RECIPIENTS**: One or more recipient email addresses are invalid
- **INVALID_CC_RECIPIENTS**: One or more CC email addresses are invalid
- **INVALID_BCC_RECIPIENTS**: One or more BCC email addresses are invalid
- **INVALID_SENDER_EMAIL**: The sender email address is invalid
- **INVALID_ATTACHMENT**: Attachment validation failed (size, type, format)

### Authentication Errors
- **INVALID_API_KEY**: SendGrid API key is invalid or lacks permissions

### Rate Limiting Errors
- **RATE_LIMIT_EXCEEDED**: Hourly email limit reached

### Service Errors
- **SENDGRID_ERROR**: SendGrid service returned an error
- **EMAIL_SEND_FAILED**: Generic email sending failure

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The test suite covers:

- **Input Validation**: Email addresses, subject, content, attachments
- **Attachment Validation**: Size limits, file type restrictions, format validation
- **Rate Limiting**: Per-hour limits and reset behavior
- **SendGrid Integration**: API calls, error handling, response processing
- **Template Functionality**: Dynamic template usage and data substitution
- **Configuration Options**: All configuration parameters and edge cases

## Development

### Project Structure

```
email-tool/
├── src/
│   └── index.ts          # Main email tool implementation
├── tests/
│   ├── setup.ts          # Jest test configuration
│   └── email.test.ts     # Comprehensive test suite
├── .env.example          # Environment configuration template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Jest testing configuration
└── README.md            # This documentation
```

### Development Commands

```bash
# Install dependencies
npm install

# Build the tool
npm run build

# Start in development mode (with hot reload)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Clean build artifacts
npm run clean
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | SendGrid API key | Required |
| `DEFAULT_FROM_EMAIL` | Default sender email | Required |
| `DEFAULT_FROM_NAME` | Default sender name | Optional |
| `PORT` | Server port | `3003` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `development` |
| `API_KEY_AUTH` | Enable API key authentication | `false` |
| `VALID_API_KEYS` | Comma-separated valid API keys | - |
| `MAX_EMAILS_PER_HOUR` | Default rate limit | `100` |

## SendGrid Setup Guide

### 1. Create SendGrid Account

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Verify your account via email
3. Complete the account setup process

### 2. Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Choose "Restricted Access"
4. Grant "Mail Send" permissions
5. Copy the generated API key

### 3. Verify Sender Identity

1. Go to Settings → Sender Authentication
2. Choose "Single Sender Verification" (for testing) or "Domain Authentication" (for production)
3. Add and verify your sender email address
4. Use this verified email as `fromEmail` in your configuration

### 4. Set up Templates (Optional)

1. Go to Email API → Dynamic Templates
2. Create a new template
3. Design your email template with handlebars syntax
4. Note the template ID (starts with "d-")

## Production Deployment

### Security Considerations

1. **API Key Security**
   - Store API keys in secure environment variables
   - Use restricted API keys with minimal permissions
   - Rotate API keys regularly

2. **Input Validation**
   - All inputs are validated and sanitized
   - File type and size restrictions are enforced
   - Email addresses are validated using RFC standards

3. **Rate Limiting**
   - Implement additional rate limiting at the infrastructure level
   - Monitor email sending patterns for abuse
   - Set appropriate daily/monthly limits

4. **Sender Reputation**
   - Use verified domains and sender addresses
   - Monitor bounce and spam complaint rates
   - Implement proper unsubscribe mechanisms

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3003
CMD ["npm", "start"]
```

### Environment Configuration

For production:

```env
NODE_ENV=production
SENDGRID_API_KEY=SG.your_production_api_key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Your Production App
PORT=3003
API_KEY_AUTH=true
VALID_API_KEYS=prod_key_1,prod_key_2
MAX_EMAILS_PER_HOUR=1000
```

### Monitoring and Logging

1. **SendGrid Analytics**
   - Monitor delivery rates and engagement metrics
   - Set up alerts for delivery failures
   - Track bounce and spam complaint rates

2. **Application Monitoring**
   - Log all email sending attempts and outcomes
   - Monitor API response times and error rates
   - Set up alerts for high error rates

3. **Rate Limiting Monitoring**
   - Track rate limit usage and violations
   - Monitor for potential abuse patterns
   - Adjust limits based on usage patterns

## Advanced Features

### Webhook Integration

Configure webhooks to receive delivery status updates:

```bash
# Example webhook endpoint
POST /webhook/sendgrid
{
  "email": "recipient@example.com",
  "event": "delivered",
  "timestamp": 1640995200,
  "sg_message_id": "msg_abc123"
}
```

### Template Best Practices

1. **Design Responsive Templates**
   - Use responsive design for mobile compatibility
   - Test templates across different email clients
   - Keep templates lightweight and fast-loading

2. **Variable Substitution**
   - Use clear, descriptive variable names
   - Provide fallback values for optional variables
   - Validate template data before sending

3. **Testing Templates**
   - Use sandbox mode for template testing
   - Send test emails to multiple email clients
   - Verify variable substitution works correctly

### Batch Email Operations

For sending to large recipient lists, consider:

1. **Batch Processing**
   - Split large recipient lists into smaller batches
   - Implement queue-based processing
   - Add delays between batches to respect rate limits

2. **Personalization**
   - Use templates with personalized content
   - Segment recipients for targeted messaging
   - Track engagement metrics for optimization

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify API key is correct and active
   - Check API key permissions include mail sending
   - Ensure API key hasn't expired

2. **Sender Verification Issues**
   - Confirm sender email is verified in SendGrid
   - Check domain authentication if using custom domain
   - Verify SPF and DKIM records are configured

3. **Delivery Issues**
   - Monitor SendGrid delivery statistics
   - Check recipient email addresses are valid
   - Review bounce and spam complaint rates

4. **Rate Limiting**
   - Check your SendGrid plan limits
   - Monitor current usage in SendGrid dashboard
   - Adjust application rate limits accordingly

5. **Template Issues**
   - Verify template ID is correct
   - Check template is active and published
   - Validate template data structure

### Debug Mode

Enable detailed logging:

```env
NODE_ENV=development
DEBUG=email-tool:*
```

### Testing with Sandbox Mode

Enable sandbox mode to test without sending actual emails:

```json
{
  "config": {
    "enableSandboxMode": true
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for new functionality
4. Ensure all tests pass: `npm test`
5. Update documentation as needed
6. Submit a pull request

## License

MIT License - see the main project LICENSE file for details.