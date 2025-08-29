# Security Implementation

This guide covers comprehensive security best practices for AI Spine tools, including authentication, input validation, data protection, and monitoring. Security is critical when creating tools that handle sensitive data or integrate with external services.

## Table of Contents

- [Security Principles](#security-principles)
- [Authentication & Authorization](#authentication--authorization)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [Data Protection](#data-protection)
- [Network Security](#network-security)
- [Rate Limiting & Abuse Prevention](#rate-limiting--abuse-prevention)
- [Logging & Monitoring](#logging--monitoring)
- [Secrets Management](#secrets-management)
- [Security Testing](#security-testing)
- [Compliance & Standards](#compliance--standards)

---

## Security Principles

### Defense in Depth

Implement multiple layers of security controls:

```typescript
const secureWeatherTool = createTool({
  metadata: {
    name: 'secure-weather-tool',
    version: '1.0.0',
    description: 'Weather tool with comprehensive security',
    capabilities: ['weather.current']
  },

  schema: {
    input: {
      city: stringField()
        .required()
        .minLength(2)
        .maxLength(100)
        .pattern('^[a-zA-Z\\s\\-\\.]+$') // Only allow safe characters
        .sanitize() // Enable input sanitization
        .description('City name (letters, spaces, hyphens, dots only)')
    },
    
    config: {
      apiKey: apiKeyField()
        .required()
        .pattern('^[a-f0-9]{32}$') // Validate API key format
        .envVar('WEATHER_API_KEY')
        .description('Weather service API key')
    }
  },

  execute: async (input, config, context) => {
    // Security validation at execution time
    if (!context.security?.apiKeyHash) {
      return {
        status: 'error',
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'API key authentication is required',
          type: 'client_error'
        }
      };
    }

    // Rate limiting check
    if (context.security.rateLimiting?.remaining === 0) {
      return {
        status: 'error',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
          type: 'client_error',
          retryable: true,
          retryAfterMs: context.security.rateLimiting.resetAt 
            ? context.security.rateLimiting.resetAt.getTime() - Date.now() 
            : 60000
        }
      };
    }

    try {
      // Secure external API call
      const response = await fetch(`https://api.weather.com/weather?q=${encodeURIComponent(input.city)}`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'User-Agent': `AI-Spine-Weather-Tool/${context.toolVersion}`,
          'Accept': 'application/json'
        },
        timeout: 10000 // Prevent hanging requests
      });

      if (!response.ok) {
        // Don't expose internal error details
        return {
          status: 'error',
          error: {
            code: 'EXTERNAL_SERVICE_ERROR',
            message: 'Weather service is temporarily unavailable',
            type: 'server_error',
            retryable: true
          }
        };
      }

      const data = await response.json();
      
      // Sanitize response data before returning
      return {
        status: 'success',
        data: {
          city: sanitizeString(data.name),
          temperature: sanitizeNumber(data.main?.temp),
          description: sanitizeString(data.weather?.[0]?.description),
          // Never expose raw API response or internal data
        }
      };

    } catch (error) {
      // Log error securely (without sensitive data)
      console.error(`Weather API error for city: ${input.city.substring(0, 20)}...`, {
        executionId: context.executionId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        status: 'error',
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Unable to fetch weather data',
          type: 'execution_error',
          retryable: true
        }
      };
    }
  }
});

// Start with security configurations
await secureWeatherTool.start({
  port: 3000,
  
  security: {
    requireAuth: true,
    apiKeys: process.env.CLIENT_API_KEYS?.split(',') || [],
    
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false
    },
    
    corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://trusted-app.com'],
    
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  }
});
```

### Principle of Least Privilege

Grant minimal necessary permissions:

```typescript
// Configuration with minimal required permissions
const permissions = {
  // Only allow HTTPS requests
  network: {
    allowedProtocols: ['https'],
    allowedDomains: ['api.weather.com', 'trusted-service.com'],
    blockPrivateIPs: true
  },
  
  // Restrict file system access
  filesystem: {
    readOnly: true,
    allowedPaths: ['/app/config', '/tmp'],
    blockedPaths: ['/etc', '/proc', '/sys']
  },
  
  // Limit resource usage
  resources: {
    maxMemory: '512MB',
    maxCPU: '500m',
    maxExecutionTime: 30000
  }
};
```

---

## Authentication & Authorization

### API Key Authentication

Implement secure API key validation:

```typescript
import crypto from 'crypto';

class SecureApiKeyValidator {
  private validApiKeys: Set<string>;
  private keyMetadata: Map<string, KeyMetadata>;

  constructor(apiKeys: string[]) {
    this.validApiKeys = new Set(apiKeys);
    this.keyMetadata = new Map();
    
    // Store hashed versions for security
    apiKeys.forEach(key => {
      const hash = this.hashApiKey(key);
      this.keyMetadata.set(hash, {
        permissions: ['tool.execute'],
        rateLimits: { requestsPerHour: 1000 },
        lastUsed: null,
        created: new Date()
      });
    });
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  validateApiKey(apiKey: string): ValidationResult {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, error: 'API key is required' };
    }

    // Constant-time comparison to prevent timing attacks
    const hash = this.hashApiKey(apiKey);
    const isValid = this.validApiKeys.has(apiKey);
    
    if (!isValid) {
      // Log security event
      this.logSecurityEvent('INVALID_API_KEY', { keyHash: hash.substring(0, 8) });
      return { valid: false, error: 'Invalid API key' };
    }

    // Update usage metadata
    const metadata = this.keyMetadata.get(hash);
    if (metadata) {
      metadata.lastUsed = new Date();
    }

    return { 
      valid: true, 
      permissions: metadata?.permissions || [],
      keyHash: hash 
    };
  }

  private logSecurityEvent(event: string, details: any): void {
    console.warn(`Security Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

// Usage in tool
const validator = new SecureApiKeyValidator(process.env.CLIENT_API_KEYS?.split(',') || []);

const authenticatedTool = createTool({
  // ... tool definition

  execute: async (input, config, context) => {
    // Validate authentication
    const authHeader = context.security?.apiKeyHash;
    if (!authHeader) {
      return {
        status: 'error',
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'API key authentication is required',
          type: 'client_error'
        }
      };
    }

    // Check permissions
    if (!context.security?.permissions?.includes('tool.execute')) {
      return {
        status: 'error',
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'API key does not have execute permissions',
          type: 'client_error'
        }
      };
    }

    // Continue with tool execution
    // ...
  }
});
```

### JWT Token Authentication

Advanced authentication with JWT tokens:

```typescript
import jwt from 'jsonwebtoken';

interface JWTPayload {
  sub: string; // user ID
  iss: string; // issuer
  aud: string; // audience (tool name)
  exp: number; // expiration
  iat: number; // issued at
  permissions: string[];
}

class JWTValidator {
  constructor(
    private secret: string,
    private issuer: string,
    private audience: string
  ) {}

  validateToken(token: string): { valid: boolean; payload?: JWTPayload; error?: string } {
    try {
      const payload = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as JWTPayload;

      // Additional validation
      if (!payload.permissions || !Array.isArray(payload.permissions)) {
        return { valid: false, error: 'Invalid token payload' };
      }

      return { valid: true, payload };

    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'
      };
    }
  }

  generateToken(userId: string, permissions: string[], expiresIn: string = '1h'): string {
    return jwt.sign(
      {
        sub: userId,
        permissions,
        iat: Math.floor(Date.now() / 1000)
      },
      this.secret,
      {
        issuer: this.issuer,
        audience: this.audience,
        expiresIn,
        algorithm: 'HS256'
      }
    );
  }
}
```

---

## Input Validation & Sanitization

### Comprehensive Input Validation

Implement multiple validation layers:

```typescript
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

class SecurityValidator {
  static validateAndSanitizeInput(input: any, field: ToolInputField): { value: any; valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let value = input;

    // Basic type validation
    if (!this.validateType(value, field.type)) {
      errors.push(`Invalid type: expected ${field.type}`);
      return { value, valid: false, errors };
    }

    // String-specific security validation
    if (field.type === 'string' && typeof value === 'string') {
      // Check for SQL injection patterns
      if (this.containsSQLInjection(value)) {
        errors.push('Input contains potentially malicious SQL patterns');
      }

      // Check for XSS patterns
      if (this.containsXSS(value)) {
        errors.push('Input contains potentially malicious script patterns');
      }

      // Check for path traversal
      if (this.containsPathTraversal(value)) {
        errors.push('Input contains path traversal patterns');
      }

      // Check for command injection
      if (this.containsCommandInjection(value)) {
        errors.push('Input contains command injection patterns');
      }

      // Sanitize if requested
      if (field.sanitize && errors.length === 0) {
        value = this.sanitizeString(value);
      }

      // Apply transformations
      if (field.transform) {
        value = this.applyTransformation(value, field.transform);
      }

      // Length validation
      if (field.minLength && value.length < field.minLength) {
        errors.push(`String too short: minimum ${field.minLength} characters`);
      }
      if (field.maxLength && value.length > field.maxLength) {
        errors.push(`String too long: maximum ${field.maxLength} characters`);
      }

      // Pattern validation
      if (field.pattern && !new RegExp(field.pattern).test(value)) {
        errors.push('String does not match required pattern');
      }
    }

    return { value, valid: errors.length === 0, errors };
  }

  private static containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i,
      /(\b(OR|AND)\b\s*\w*\s*(=|LIKE)\s*\w*)/i,
      /(--|\/\*|\*\/|#)/,
      /(\bEXEC\b|\bEXECUTE\b)/i,
      /(\bSP_\w+\b)/i
    ];
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private static containsXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  }

  private static containsPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\.\//g,
      /\.\.\\+/g,
      /%2e%2e%2f/gi,
      /%2e%2e\//gi,
      /\.\.\%2f/gi
    ];
    return pathPatterns.some(pattern => pattern.test(input));
  }

  private static containsCommandInjection(input: string): boolean {
    const cmdPatterns = [
      /[;&|`$(){}[\]<>]/,
      /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig)\b/i,
      /\b(curl|wget|nc|telnet|ssh)\b/i
    ];
    return cmdPatterns.some(pattern => pattern.test(input));
  }

  private static sanitizeString(input: string): string {
    // Remove potentially dangerous characters
    let sanitized = input.replace(/[<>\"'&]/g, '');
    
    // HTML purification
    sanitized = purify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    return sanitized.trim();
  }

  private static applyTransformation(input: string, transform: string): string {
    switch (transform) {
      case 'trim': return input.trim();
      case 'lowercase': return input.toLowerCase();
      case 'uppercase': return input.toUpperCase();
      case 'normalize': return input.normalize('NFKC');
      default: return input;
    }
  }

  private static validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      default: return true;
    }
  }
}
```

### File Upload Security

Secure file upload handling:

```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

class SecureFileHandler {
  private allowedMimeTypes: Set<string>;
  private maxFileSize: number;
  private uploadPath: string;

  constructor(allowedMimeTypes: string[], maxFileSize: number, uploadPath: string) {
    this.allowedMimeTypes = new Set(allowedMimeTypes);
    this.maxFileSize = maxFileSize;
    this.uploadPath = uploadPath;
  }

  validateFile(file: Express.Multer.File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // MIME type validation
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed`);
    }

    // File size validation
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${file.size} exceeds maximum ${this.maxFileSize}`);
    }

    // Filename security
    if (this.containsDangerousFilename(file.originalname)) {
      errors.push('Filename contains dangerous patterns');
    }

    // File header validation (magic number check)
    if (!this.validateFileHeader(file.buffer, file.mimetype)) {
      errors.push('File header does not match MIME type');
    }

    return { valid: errors.length === 0, errors };
  }

  private containsDangerousFilename(filename: string): boolean {
    const dangerousPatterns = [
      /\.\./,
      /[<>:"/\\|?*]/,
      /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i
    ];
    return dangerousPatterns.some(pattern => pattern.test(filename));
  }

  private validateFileHeader(buffer: Buffer, mimetype: string): boolean {
    if (!buffer || buffer.length < 4) return false;

    const header = buffer.subarray(0, 4);
    
    switch (mimetype) {
      case 'image/jpeg':
        return header[0] === 0xFF && header[1] === 0xD8;
      case 'image/png':
        return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      case 'application/pdf':
        return buffer.subarray(0, 4).toString() === '%PDF';
      default:
        return true; // Skip validation for unknown types
    }
  }

  generateSecureFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const randomName = crypto.randomBytes(16).toString('hex');
    return `${randomName}${ext}`;
  }
}
```

---

## Data Protection

### Sensitive Data Handling

Protect sensitive information:

```typescript
class SensitiveDataHandler {
  private static sensitivePatterns = [
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
    /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // IP address
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i // UUID
  ];

  static detectSensitiveData(text: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(text));
  }

  static maskSensitiveData(text: string): string {
    let masked = text;
    
    // Mask credit card numbers
    masked = masked.replace(/\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/g, 
      '$1-****-****-$4');
    
    // Mask SSN
    masked = masked.replace(/\b(\d{3})-?(\d{2})-?(\d{4})\b/g, 
      '***-**-$3');
    
    // Mask email
    masked = masked.replace(/\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g, 
      '***@$2');
    
    return masked;
  }

  static encryptSensitiveField(value: string, key: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  static decryptSensitiveField(encryptedValue: string, key: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Usage in tool execution
execute: async (input, config, context) => {
  // Check for sensitive data in inputs
  const inputText = JSON.stringify(input);
  if (SensitiveDataHandler.detectSensitiveData(inputText)) {
    console.warn('Sensitive data detected in input', {
      executionId: context.executionId,
      masked: SensitiveDataHandler.maskSensitiveData(inputText)
    });
  }

  // Process with encryption for sensitive fields
  if (input.creditCard) {
    input.creditCard = SensitiveDataHandler.encryptSensitiveField(
      input.creditCard, 
      config.encryptionKey
    );
  }

  // ... tool execution
}
```

### Data Retention & Cleanup

Implement secure data lifecycle management:

```typescript
class DataRetentionManager {
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();

  constructor() {
    this.setupPolicies();
    this.startCleanupScheduler();
  }

  private setupPolicies(): void {
    this.retentionPolicies.set('execution_logs', {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      autoDelete: true,
      encryption: true
    });

    this.retentionPolicies.set('sensitive_data', {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoDelete: true,
      encryption: true,
      requireSecureDeletion: true
    });

    this.retentionPolicies.set('user_data', {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      autoDelete: false, // Manual review required
      encryption: true
    });
  }

  private startCleanupScheduler(): void {
    setInterval(async () => {
      await this.performCleanup();
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  private async performCleanup(): Promise<void> {
    for (const [dataType, policy] of this.retentionPolicies) {
      if (policy.autoDelete) {
        await this.cleanupExpiredData(dataType, policy);
      }
    }
  }

  private async cleanupExpiredData(dataType: string, policy: RetentionPolicy): Promise<void> {
    const cutoffDate = new Date(Date.now() - policy.maxAge);
    
    try {
      // Secure deletion for sensitive data
      if (policy.requireSecureDeletion) {
        await this.secureDelete(dataType, cutoffDate);
      } else {
        await this.standardDelete(dataType, cutoffDate);
      }

      console.log(`Cleaned up expired ${dataType} data older than ${cutoffDate.toISOString()}`);
    } catch (error) {
      console.error(`Failed to cleanup ${dataType}:`, error);
    }
  }

  private async secureDelete(dataType: string, cutoffDate: Date): Promise<void> {
    // Implement secure deletion (overwrite multiple times)
    // This is a simplified example
    console.log(`Securely deleting ${dataType} data older than ${cutoffDate}`);
  }

  private async standardDelete(dataType: string, cutoffDate: Date): Promise<void> {
    // Standard deletion
    console.log(`Deleting ${dataType} data older than ${cutoffDate}`);
  }
}

interface RetentionPolicy {
  maxAge: number;
  autoDelete: boolean;
  encryption: boolean;
  requireSecureDeletion?: boolean;
}
```

---

## Network Security

### HTTPS and TLS Configuration

Enforce secure connections:

```typescript
import https from 'https';
import fs from 'fs';

const tlsOptions = {
  key: fs.readFileSync(process.env.TLS_KEY_PATH || './certs/private-key.pem'),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH || './certs/certificate.pem'),
  
  // Security settings
  secureProtocol: 'TLSv1_2_method',
  honorCipherOrder: true,
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':'),
  
  // Reject unauthorized connections
  requestCert: false,
  rejectUnauthorized: true
};

// Start tool with HTTPS
await secureTool.start({
  port: 3443,
  https: true,
  tlsOptions,
  
  security: {
    requireAuth: true,
    corsOrigins: ['https://trusted-domain.com'],
    
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none';"
    }
  }
});
```

### Request Origin Validation

Implement CORS and origin checking:

```typescript
class OriginValidator {
  private allowedOrigins: Set<string>;
  private allowedPatterns: RegExp[];

  constructor(origins: string[]) {
    this.allowedOrigins = new Set();
    this.allowedPatterns = [];

    origins.forEach(origin => {
      if (origin.includes('*')) {
        // Convert wildcard to regex
        const pattern = origin
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        this.allowedPatterns.push(new RegExp(`^${pattern}$`));
      } else {
        this.allowedOrigins.add(origin);
      }
    });
  }

  validateOrigin(origin: string | undefined): boolean {
    if (!origin) return false;

    // Check exact matches
    if (this.allowedOrigins.has(origin)) {
      return true;
    }

    // Check pattern matches
    return this.allowedPatterns.some(pattern => pattern.test(origin));
  }

  getSecureHeaders(origin: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };

    if (this.validateOrigin(origin)) {
      headers['Access-Control-Allow-Origin'] = origin!;
      headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key';
      headers['Access-Control-Max-Age'] = '86400';
    }

    return headers;
  }
}
```

---

## Rate Limiting & Abuse Prevention

### Advanced Rate Limiting

Implement sophisticated rate limiting:

```typescript
class AdvancedRateLimiter {
  private windowMap = new Map<string, Window[]>();
  private blockList = new Set<string>();
  
  constructor(
    private windowSizeMs: number,
    private maxRequests: number,
    private blockDurationMs: number = 60000
  ) {
    this.startCleanupTimer();
  }

  checkRateLimit(identifier: string): RateLimitResult {
    const now = Date.now();
    
    // Check if identifier is blocked
    if (this.blockList.has(identifier)) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + this.blockDurationMs,
        blocked: true
      };
    }

    // Get or create windows for this identifier
    let windows = this.windowMap.get(identifier) || [];
    
    // Remove expired windows
    windows = windows.filter(window => 
      now - window.startTime < this.windowSizeMs
    );

    // Count total requests in current windows
    const totalRequests = windows.reduce((sum, window) => 
      sum + window.requests, 0
    );

    if (totalRequests >= this.maxRequests) {
      // Block the identifier
      this.blockList.add(identifier);
      setTimeout(() => this.blockList.delete(identifier), this.blockDurationMs);
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + this.windowSizeMs,
        blocked: true
      };
    }

    // Add request to current window or create new window
    const currentWindow = windows.find(window => 
      now - window.startTime < this.windowSizeMs / 4 // Use quarter windows
    );

    if (currentWindow) {
      currentWindow.requests++;
    } else {
      windows.push({
        startTime: now,
        requests: 1
      });
    }

    this.windowMap.set(identifier, windows);

    return {
      allowed: true,
      remainingRequests: this.maxRequests - totalRequests - 1,
      resetTime: now + this.windowSizeMs,
      blocked: false
    };
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [identifier, windows] of this.windowMap.entries()) {
        const validWindows = windows.filter(window => 
          now - window.startTime < this.windowSizeMs
        );
        
        if (validWindows.length === 0) {
          this.windowMap.delete(identifier);
        } else if (validWindows.length !== windows.length) {
          this.windowMap.set(identifier, validWindows);
        }
      }
    }, this.windowSizeMs / 2);
  }
}

interface Window {
  startTime: number;
  requests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  blocked: boolean;
}

// Usage in tool
const rateLimiter = new AdvancedRateLimiter(
  15 * 60 * 1000, // 15 minute window
  100,            // 100 requests per window
  5 * 60 * 1000   // 5 minute block duration
);

const secureExecute = async (input: any, config: any, context: ToolExecutionContext) => {
  const identifier = context.security?.sourceIp || context.security?.apiKeyHash || 'unknown';
  
  const rateLimit = rateLimiter.checkRateLimit(identifier);
  
  if (!rateLimit.allowed) {
    return {
      status: 'error',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: rateLimit.blocked 
          ? 'You have been temporarily blocked due to excessive requests'
          : 'Rate limit exceeded. Please slow down.',
        type: 'client_error',
        retryable: true,
        retryAfterMs: rateLimit.resetTime - Date.now()
      }
    };
  }

  // Continue with normal execution
  // ...
};
```

---

## Logging & Monitoring

### Security-Aware Logging

Implement secure logging practices:

```typescript
class SecurityLogger {
  private sensitiveFields = new Set([
    'password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'
  ]);

  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitizeLogData(data)
    };

    // Send to secure logging service
    console.log(JSON.stringify(logEntry));
  }

  logSecurityEvent(event: string, details: any): void {
    const securityEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event,
      details: this.sanitizeLogData(details),
      severity: this.getSecuritySeverity(event)
    };

    // Send to security monitoring system
    console.warn('SECURITY_EVENT:', JSON.stringify(securityEntry));
    
    // Alert on high severity events
    if (securityEntry.severity === 'HIGH') {
      this.sendSecurityAlert(securityEntry);
    }
  }

  private sanitizeLogData(data: any): any {
    if (!data) return data;

    if (typeof data === 'string') {
      return SensitiveDataHandler.maskSensitiveData(data);
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.sensitiveFields.has(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeLogData(value);
        } else if (typeof value === 'string') {
          sanitized[key] = SensitiveDataHandler.maskSensitiveData(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return data;
  }

  private getSecuritySeverity(event: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const highSeverityEvents = [
      'AUTHENTICATION_FAILURE',
      'UNAUTHORIZED_ACCESS',
      'SQL_INJECTION_ATTEMPT',
      'XSS_ATTEMPT'
    ];

    const mediumSeverityEvents = [
      'RATE_LIMIT_EXCEEDED',
      'SUSPICIOUS_INPUT',
      'INVALID_API_KEY'
    ];

    if (highSeverityEvents.includes(event)) return 'HIGH';
    if (mediumSeverityEvents.includes(event)) return 'MEDIUM';
    return 'LOW';
  }

  private async sendSecurityAlert(entry: any): Promise<void> {
    // Send to security team or alerting system
    console.error('HIGH SEVERITY SECURITY EVENT:', entry);
  }
}
```

---

## Secrets Management

### Environment-Based Configuration

Secure secrets management:

```typescript
class SecretsManager {
  private secrets = new Map<string, string>();
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.SECRETS_ENCRYPTION_KEY || 
      crypto.randomBytes(32).toString('hex');
    this.loadSecrets();
  }

  private loadSecrets(): void {
    // Load from environment variables
    const envSecrets = [
      'API_KEY',
      'DATABASE_URL', 
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    envSecrets.forEach(secret => {
      const value = process.env[secret];
      if (value) {
        this.secrets.set(secret, value);
      }
    });

    // Load from secure files (if available)
    try {
      const secretsFile = process.env.SECRETS_FILE || '/run/secrets/app-secrets.json';
      if (fs.existsSync(secretsFile)) {
        const fileSecrets = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
        Object.entries(fileSecrets).forEach(([key, value]) => {
          this.secrets.set(key, value as string);
        });
      }
    } catch (error) {
      console.warn('Failed to load secrets file:', error.message);
    }
  }

  getSecret(name: string): string | undefined {
    return this.secrets.get(name);
  }

  setSecret(name: string, value: string, encrypt: boolean = true): void {
    const secretValue = encrypt ? this.encrypt(value) : value;
    this.secrets.set(name, secretValue);
  }

  private encrypt(value: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encryptedValue: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Clear secrets from memory on shutdown
  clearSecrets(): void {
    this.secrets.clear();
  }
}

// Global secrets manager
const secretsManager = new SecretsManager();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  secretsManager.clearSecrets();
  process.exit(0);
});
```

---

## Security Testing

### Automated Security Testing

Implement security test suites:

```typescript
import { createTool, stringField, apiKeyField } from '@ai-spine/tools';
import { SecurityTestSuite } from '@ai-spine/tools-testing';

describe('Security Tests', () => {
  let tool: any;
  let securityTests: SecurityTestSuite;

  beforeEach(async () => {
    tool = createTool({
      metadata: {
        name: 'test-security-tool',
        version: '1.0.0',
        description: 'Tool for security testing',
        capabilities: ['test']
      },
      
      schema: {
        input: {
          query: stringField()
            .required()
            .maxLength(100)
            .sanitize()
            .description('Search query')
        },
        
        config: {
          apiKey: apiKeyField()
            .required()
            .pattern('^key-[a-f0-9]{32}$')
        }
      },
      
      execute: async (input, config, context) => {
        return { status: 'success', data: { result: input.query } };
      }
    });

    await tool.start({ port: 0 }); // Use random port
    securityTests = new SecurityTestSuite(tool);
  });

  afterEach(async () => {
    await tool.stop();
  });

  test('should reject SQL injection attempts', async () => {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "UNION SELECT * FROM passwords",
      "'; INSERT INTO admin (user) VALUES ('hacker'); --"
    ];

    for (const input of maliciousInputs) {
      const result = await securityTests.testSQLInjection({ query: input });
      expect(result.blocked).toBe(true);
      expect(result.error).toContain('malicious SQL patterns');
    }
  });

  test('should reject XSS attempts', async () => {
    const xssInputs = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert(document.cookie)',
      '<iframe src="javascript:alert(1)"></iframe>'
    ];

    for (const input of xssInputs) {
      const result = await securityTests.testXSS({ query: input });
      expect(result.blocked).toBe(true);
      expect(result.error).toContain('script patterns');
    }
  });

  test('should enforce rate limiting', async () => {
    const result = await securityTests.testRateLimit({
      requestCount: 150,
      timeWindow: 60000,
      expectedLimit: 100
    });

    expect(result.rateLimited).toBe(true);
    expect(result.blockedRequests).toBeGreaterThan(50);
  });

  test('should validate API key format', async () => {
    const invalidKeys = [
      'invalid-key',
      'key-short',
      'key-xyz123abc', // Wrong characters
      '' // Empty
    ];

    for (const apiKey of invalidKeys) {
      const result = await securityTests.testAuthentication({ apiKey });
      expect(result.authenticated).toBe(false);
    }
  });

  test('should sanitize input data', async () => {
    const dirtyInput = '<script>alert("xss")</script>Hello World!';
    const result = await tool.execute({ query: dirtyInput });
    
    expect(result.status).toBe('success');
    expect(result.data.result).not.toContain('<script>');
    expect(result.data.result).toContain('Hello World!');
  });
});
```

---

## Compliance & Standards

### Security Standards Compliance

Implement compliance with security standards:

```typescript
class ComplianceManager {
  private standards = new Map<string, ComplianceStandard>();

  constructor() {
    this.initializeStandards();
  }

  private initializeStandards(): void {
    // OWASP Top 10 compliance
    this.standards.set('OWASP', {
      name: 'OWASP Top 10',
      requirements: [
        'injection-protection',
        'authentication',
        'sensitive-data-exposure',
        'xml-external-entities',
        'broken-access-control',
        'security-misconfiguration',
        'cross-site-scripting',
        'insecure-deserialization',
        'vulnerable-components',
        'insufficient-logging'
      ],
      validator: this.validateOWASP.bind(this)
    });

    // PCI DSS compliance (if handling payment data)
    this.standards.set('PCI-DSS', {
      name: 'PCI Data Security Standard',
      requirements: [
        'encryption-at-rest',
        'encryption-in-transit',
        'access-control',
        'network-segmentation',
        'vulnerability-management',
        'monitoring-logging'
      ],
      validator: this.validatePCIDSS.bind(this)
    });
  }

  async validateCompliance(standardName: string, toolConfig: any): Promise<ComplianceResult> {
    const standard = this.standards.get(standardName);
    if (!standard) {
      throw new Error(`Unknown compliance standard: ${standardName}`);
    }

    return await standard.validator(toolConfig);
  }

  private async validateOWASP(toolConfig: any): Promise<ComplianceResult> {
    const results: ComplianceCheck[] = [];
    
    // Check injection protection
    results.push({
      requirement: 'injection-protection',
      passed: toolConfig.inputValidation && toolConfig.sanitization,
      details: 'Input validation and sanitization configured'
    });

    // Check authentication
    results.push({
      requirement: 'authentication',
      passed: toolConfig.security?.requireAuth === true,
      details: 'API key authentication required'
    });

    // Check XSS protection
    results.push({
      requirement: 'cross-site-scripting',
      passed: toolConfig.security?.headers?.['X-XSS-Protection'] !== undefined,
      details: 'XSS protection headers configured'
    });

    // Check logging
    results.push({
      requirement: 'insufficient-logging',
      passed: toolConfig.logging?.securityEvents === true,
      details: 'Security event logging enabled'
    });

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    return {
      standard: 'OWASP Top 10',
      passed: passedCount === totalCount,
      score: (passedCount / totalCount) * 100,
      checks: results
    };
  }

  private async validatePCIDSS(toolConfig: any): Promise<ComplianceResult> {
    const results: ComplianceCheck[] = [];
    
    // Check encryption in transit
    results.push({
      requirement: 'encryption-in-transit',
      passed: toolConfig.https === true,
      details: 'HTTPS/TLS encryption enforced'
    });

    // Check access control
    results.push({
      requirement: 'access-control',
      passed: toolConfig.security?.requireAuth === true,
      details: 'Authentication and authorization implemented'
    });

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    return {
      standard: 'PCI DSS',
      passed: passedCount === totalCount,
      score: (passedCount / totalCount) * 100,
      checks: results
    };
  }
}

interface ComplianceStandard {
  name: string;
  requirements: string[];
  validator: (toolConfig: any) => Promise<ComplianceResult>;
}

interface ComplianceResult {
  standard: string;
  passed: boolean;
  score: number;
  checks: ComplianceCheck[];
}

interface ComplianceCheck {
  requirement: string;
  passed: boolean;
  details: string;
}
```

### Security Audit Implementation

```typescript
class SecurityAuditor {
  async performSecurityAudit(tool: any): Promise<SecurityAuditReport> {
    const report: SecurityAuditReport = {
      timestamp: new Date().toISOString(),
      toolName: tool.metadata.name,
      version: tool.metadata.version,
      findings: [],
      score: 0,
      recommendations: []
    };

    // Authentication audit
    const authFindings = await this.auditAuthentication(tool);
    report.findings.push(...authFindings);

    // Input validation audit  
    const inputFindings = await this.auditInputValidation(tool);
    report.findings.push(...inputFindings);

    // Configuration audit
    const configFindings = await this.auditConfiguration(tool);
    report.findings.push(...configFindings);

    // Network security audit
    const networkFindings = await this.auditNetworkSecurity(tool);
    report.findings.push(...networkFindings);

    // Calculate security score
    report.score = this.calculateSecurityScore(report.findings);
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.findings);

    return report;
  }

  private async auditAuthentication(tool: any): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    
    if (!tool.config?.security?.requireAuth) {
      findings.push({
        severity: 'HIGH',
        category: 'Authentication',
        description: 'Tool does not require authentication',
        recommendation: 'Enable API key authentication'
      });
    }

    return findings;
  }

  private calculateSecurityScore(findings: SecurityFinding[]): number {
    const weights = { HIGH: 10, MEDIUM: 5, LOW: 1 };
    const totalIssues = findings.reduce((sum, finding) => 
      sum + weights[finding.severity], 0
    );
    
    const maxScore = 100;
    return Math.max(0, maxScore - totalIssues);
  }

  private generateRecommendations(findings: SecurityFinding[]): string[] {
    return findings
      .filter(f => f.severity === 'HIGH')
      .map(f => f.recommendation);
  }
}

interface SecurityAuditReport {
  timestamp: string;
  toolName: string;
  version: string;
  findings: SecurityFinding[];
  score: number;
  recommendations: string[];
}

interface SecurityFinding {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  recommendation: string;
}
```

---

This comprehensive security guide covers all major aspects of securing AI Spine tools. Remember to:

1. **Layer your security** - Don't rely on a single control
2. **Validate everything** - Never trust user input
3. **Log security events** - Monitor for suspicious activity  
4. **Keep secrets secure** - Use proper secrets management
5. **Test your security** - Regular penetration testing and audits
6. **Stay updated** - Keep dependencies and security practices current

For more information, see:
- [Testing Strategies](./testing.md) - Security testing approaches
- [Error Handling](./error-handling.md) - Secure error handling
- [Integration Guides](../integration/README.md) - Secure deployment practices