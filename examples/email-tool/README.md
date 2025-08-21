# Email Tool Example

A powerful email sending tool built with the AI Spine Tools SDK that supports templates, attachments, scheduling, and delivery tracking using SendGrid.

## Features

- **Rich Email Content**: Send HTML or plain text emails
- **Template Support**: Use SendGrid dynamic templates with variables
- **Attachments**: Support for file attachments with Base64 encoding
- **Email Scheduling**: Schedule emails for future delivery
- **Multiple Recipients**: Support for TO, CC, and BCC recipients
- **Delivery Tracking**: Click tracking, open tracking, and subscription management
- **Sandbox Mode**: Test mode that doesn't actually send emails

## Quick Start

1. **Get API Key**: Sign up at [SendGrid](https://sendgrid.com/) and get your API key

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your SendGrid API key and from email
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Send Test Email**:
   ```bash
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{
       "input_data": {
         "to": ["recipient@example.com"],
         "subject": "Hello from AI Spine!",
         "content": {
           "type": "html",
           "value": "<h1>Hello!</h1><p>This is a test email from the AI Spine email tool.</p>"
         }
       },
       "config": {
         "sendgrid_api_key": "your-sendgrid-api-key",
         "default_from_email": "sender@yourdomain.com",
         "default_from_name": "Your Name"
       }
     }'
   ```

## API Usage

### Input Parameters

- **to** (required): Array of recipient email addresses
- **subject** (required): Email subject line (max 200 chars)
- **content** (required): Email content object with type ('html' or 'text') and value
- **from** (optional): Sender email (overrides config default)
- **cc** (optional): Array of CC recipients
- **bcc** (optional): Array of BCC recipients
- **attachments** (optional): Array of attachment objects
- **sendAt** (optional): Schedule send time (ISO 8601 format)
- **templateId** (optional): SendGrid template ID for template emails
- **templateData** (optional): Template variables object

### Configuration

- **sendgrid_api_key** (required): Your SendGrid API key
- **default_from_email** (required): Default sender email address
- **default_from_name** (optional): Default sender name
- **sandbox_mode** (optional): Enable test mode (default: false)
- **tracking** (optional): Email tracking settings object

### Attachment Format

```json
{
  "filename": "document.pdf",
  "content": "base64-encoded-content",
  "type": "application/pdf",
  "disposition": "attachment"
}
```

### Template Email Example

```json
{
  "input_data": {
    "to": ["user@example.com"],
    "subject": "Welcome!",
    "templateId": "d-1234567890abcdef",
    "templateData": {
      "first_name": "John",
      "company": "Acme Corp"
    }
  }
}
```

### Scheduled Email Example

```json
{
  "input_data": {
    "to": ["user@example.com"],
    "subject": "Scheduled Email",
    "content": {
      "type": "text",
      "value": "This email was scheduled for delivery."
    },
    "sendAt": "2024-01-01T15:30:00Z"
  }
}
```

### Example Response

```json
{
  "execution_id": "exec_12345",
  "status": "success",
  "output_data": {
    "success": true,
    "message_id": "abc123def456",
    "recipients": {
      "to": ["recipient@example.com"],
      "cc": [],
      "bcc": [],
      "total_count": 1
    },
    "email_details": {
      "subject": "Hello from AI Spine!",
      "from": {
        "email": "sender@yourdomain.com",
        "name": "Your Name"
      },
      "content_type": "html",
      "has_attachments": false,
      "scheduled": false
    },
    "delivery_info": {
      "status_code": 202,
      "send_time_ms": 1200,
      "sandbox_mode": false,
      "tracking_enabled": {
        "click_tracking": true,
        "open_tracking": true
      }
    }
  }
}
```

## Advanced Features

### Tracking Configuration

```json
{
  "config": {
    "tracking": {
      "click_tracking": true,
      "open_tracking": true,
      "subscription_tracking": false
    }
  }
}
```

### Sandbox Mode

Enable sandbox mode for testing without actually sending emails:

```json
{
  "config": {
    "sandbox_mode": true
  }
}
```

## Deployment

### Docker

```bash
# Build image
docker build -t email-tool .

# Run container
docker run -p 3000:3000 \
  -e SENDGRID_API_KEY=your-key \
  -e DEFAULT_FROM_EMAIL=sender@yourdomain.com \
  email-tool
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Error Handling

The tool provides detailed error messages for common issues:

- **Invalid API Key**: Check your SendGrid API key and permissions
- **Authentication Failed**: Verify API key has email sending permissions
- **Rate Limit Exceeded**: Too many emails sent, try again later
- **Invalid Email Addresses**: Check recipient email format
- **Template Not Found**: Verify SendGrid template ID exists

## Testing

```bash
# Run tests
npm test

# Test with sandbox mode
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "to": ["test@example.com"],
      "subject": "Test Email",
      "content": {"type": "text", "value": "Test content"}
    },
    "config": {
      "sendgrid_api_key": "your-key",
      "default_from_email": "sender@yourdomain.com",
      "sandbox_mode": true
    }
  }'
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `SENDGRID_API_KEY` - Your SendGrid API key
- `DEFAULT_FROM_EMAIL` - Default sender email address

## Best Practices

1. **Always use sandbox mode** for testing
2. **Validate email addresses** before sending
3. **Keep API keys secure** and use environment variables
4. **Monitor delivery rates** and track bounces
5. **Use templates** for consistent branding
6. **Test scheduled emails** thoroughly before production use

## License

MIT License - see LICENSE file for details.