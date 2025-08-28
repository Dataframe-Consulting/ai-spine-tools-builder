# Contributing Guide

Thank you for your interest in contributing to AI Spine Tools SDK! This guide will help you understand how to contribute effectively to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Contribution Types](#contribution-types)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./code-of-conduct.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to community@ai-spine.com.

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **TypeScript**: Basic knowledge recommended
- **Jest**: For testing (knowledge helpful)

### Setting Up Development Environment

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/ai-spine-tools-builder.git
   cd ai-spine-tools-builder
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies using Lerna
   npm run bootstrap
   ```

3. **Build the Project**
   ```bash
   # Build all packages
   npm run build
   ```

4. **Run Tests**
   ```bash
   # Run test suite
   npm test
   
   # Run tests with coverage
   npm run test:coverage
   ```

5. **Start Development**
   ```bash
   # Start development mode with file watching
   npm run dev:watch
   ```

### Project Structure Understanding

```
ai-spine-tools-builder/
├── packages/
│   ├── ai-spine-tools-core/     # Core types and utilities
│   ├── ai-spine-tools/          # Main API (createTool, etc.)
│   ├── ai-spine-tools-testing/  # Testing utilities
│   └── create-ai-spine-tool/    # CLI tool
├── examples/                    # Example implementations
├── docs/                        # Documentation
├── scripts/                     # Build and management scripts
├── qa/                         # Quality assurance files
└── documentation/              # ADRs and technical docs
```

## Development Workflow

### Branch Naming Convention

```bash
# Feature branches
feature/add-new-field-type
feature/improve-validation-performance

# Bug fix branches
fix/validation-error-handling
fix/memory-leak-in-cache

# Documentation branches
docs/update-api-reference
docs/add-deployment-guide

# Chore branches (maintenance, deps, etc.)
chore/update-dependencies
chore/improve-build-process
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
type(scope): description

# Examples
feat(core): add support for date field validation
fix(validation): handle edge case in array validation
docs(api): update createTool documentation
chore(deps): update TypeScript to 5.1.0
test(integration): add tests for CLI template generation
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or fixing tests
- `chore`: Changes to build process, dependencies, etc.

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): add your feature description"
   ```

4. **Keep Branch Updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## Contribution Types

### 🐛 Bug Reports

When reporting bugs, please include:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**Steps to Reproduce**
1. Create tool with configuration X
2. Call execute with input Y
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., macOS 13.4]
- Node.js version: [e.g., 18.16.0]
- SDK version: [e.g., 1.0.0]
- TypeScript version: [e.g., 5.1.0]

**Additional Context**
- Error logs
- Code samples
- Screenshots if applicable
```

### ✨ Feature Requests

For feature requests, please include:

```markdown
**Feature Description**
A clear and concise description of the feature you'd like.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
How you envision this feature working.

**Alternative Solutions**
Other approaches you've considered.

**Additional Context**
Examples, mockups, or related issues.
```

### 🔧 Code Contributions

#### Areas for Contribution

1. **Core Framework**
   - New field types and validation rules
   - Performance improvements
   - Error handling enhancements

2. **CLI Tool**
   - New project templates
   - Enhanced interactive prompts
   - Template validation improvements

3. **Testing Framework**
   - Additional test utilities
   - Mock improvements
   - Test data generators

4. **Documentation**
   - API reference improvements
   - Tutorial additions
   - Example tool implementations

5. **Examples**
   - New tool examples
   - Best practice demonstrations
   - Integration pattern examples

#### Code Contribution Guidelines

1. **Start with Issues**
   - Look for issues labeled `good first issue`, `help wanted`
   - Comment on issues you'd like to work on
   - Ask questions if requirements are unclear

2. **Follow Existing Patterns**
   - Study existing code structure
   - Maintain consistency with current APIs
   - Use established naming conventions

3. **Add Comprehensive Tests**
   - Unit tests for new functionality
   - Integration tests for API changes
   - Update existing tests if needed

4. **Update Documentation**
   - JSDoc comments for new APIs
   - README updates for new features
   - Documentation site updates

## Pull Request Process

### PR Template

When creating a pull request, please use this template:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Fixes #(issue_number)
Relates to #(issue_number)

## Testing
- [ ] New tests added for changes
- [ ] All existing tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Code comments updated
- [ ] Documentation updated
- [ ] Examples updated if needed

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**
   - All CI/CD checks must pass
   - Code coverage must meet thresholds
   - Lint and type checking must pass

2. **Code Review**
   - At least one maintainer approval required
   - Address all review feedback
   - Keep discussions constructive and professional

3. **Final Checks**
   - Rebase on latest main if needed
   - Squash commits if requested
   - Ensure PR title follows conventional commits

## Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types and comprehensive interfaces
interface ToolExecutionOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly validateInput?: boolean;
}

export async function executeToolSafely(
  tool: Tool,
  input: ToolInput,
  options: ToolExecutionOptions = {}
): Promise<ToolExecutionResult> {
  const { timeout = 30000, retries = 3, validateInput = true } = options;
  
  if (validateInput) {
    validateToolInput(input, tool.getSchema());
  }
  
  return withRetry(() => 
    tool.execute(input, { timeout }),
    retries
  );
}

// ❌ Avoid: Loose types and unclear contracts
export function doStuff(tool: any, data: any, opts?: any) {
  // Implementation unclear from signature
}
```

### Code Organization

```typescript
/**
 * Field builder for creating string input fields with comprehensive validation.
 * 
 * This builder provides a fluent API for defining string fields with various
 * validation rules including length constraints, format validation, and 
 * enumeration values.
 * 
 * @param options - Initial field configuration options
 * @returns Configured string field definition
 * 
 * @example
 * ```typescript
 * // Simple string field
 * const nameField = stringField({
 *   required: true,
 *   description: 'User name'
 * });
 * 
 * // String field with validation
 * const emailField = stringField({
 *   required: true,
 *   format: 'email',
 *   description: 'User email address',
 *   example: 'user@example.com'
 * });
 * ```
 */
export function stringField(options: Partial<ToolInputField> = {}): ToolInputField {
  // Implementation with clear logic flow
  return {
    type: 'string',
    required: options.required ?? false,
    ...options
  };
}
```

### Error Handling Standards

```typescript
// ✅ Good: Specific error types with context
export class ValidationError extends ToolError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    field?: string,
    value?: any,
    cause?: Error
  ) {
    super(message, 'VALIDATION_ERROR', { field, value, cause: cause?.message });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }

  public static fromFieldValidation(
    field: string,
    value: any,
    rule: string,
    details?: string
  ): ValidationError {
    const message = `Field '${field}' validation failed: ${rule}${details ? ` (${details})` : ''}`;
    return new ValidationError(message, field, value);
  }
}

// ❌ Avoid: Generic errors without context
throw new Error('Something went wrong');
```

### Performance Considerations

```typescript
// ✅ Good: Efficient validation with early returns
function validateStringField(value: any, field: ToolInputField): ValidationResult {
  // Early type check
  if (typeof value !== 'string') {
    return { valid: false, error: 'Must be a string' };
  }

  // Early return for empty optional fields
  if (!field.required && value === '') {
    return { valid: true };
  }

  // Efficient constraint checking
  if (field.minLength !== undefined && value.length < field.minLength) {
    return { valid: false, error: `Minimum length is ${field.minLength}` };
  }

  if (field.maxLength !== undefined && value.length > field.maxLength) {
    return { valid: false, error: `Maximum length is ${field.maxLength}` };
  }

  return { valid: true };
}

// ❌ Avoid: Inefficient validation
function validateFieldSlowly(value: any, field: ToolInputField): boolean {
  const errors = [];
  // Collect all errors even if early failures occur
  if (typeof value !== 'string') errors.push('Not a string');
  if (value.length < (field.minLength || 0)) errors.push('Too short');
  if (value.length > (field.maxLength || Infinity)) errors.push('Too long');
  // Return only boolean, losing error context
  return errors.length === 0;
}
```

## Testing Guidelines

### Test Structure

```typescript
// ✅ Good: Comprehensive test structure
describe('stringField', () => {
  describe('field creation', () => {
    it('should create a basic string field with defaults', () => {
      const field = stringField();
      
      expect(field.type).toBe('string');
      expect(field.required).toBe(false);
    });

    it('should apply provided options', () => {
      const field = stringField({
        required: true,
        minLength: 5,
        maxLength: 100,
        description: 'Test field'
      });

      expect(field.required).toBe(true);
      expect(field.minLength).toBe(5);
      expect(field.maxLength).toBe(100);
      expect(field.description).toBe('Test field');
    });
  });

  describe('validation behavior', () => {
    it('should validate required fields', () => {
      const field = stringField({ required: true });
      
      expect(validateField('', field)).toEqual({
        valid: false,
        error: 'Field is required'
      });
      
      expect(validateField('valid', field)).toEqual({
        valid: true
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      const field = stringField({ required: false });
      
      expect(validateField(null, field)).toEqual({
        valid: false,
        error: 'Must be a string or undefined'
      });
      
      expect(validateField(undefined, field)).toEqual({
        valid: true
      });
    });
  });
});
```

### Integration Test Examples

```typescript
describe('Tool Creation Integration', () => {
  it('should create and execute a complete tool', async () => {
    const tool = createTool({
      metadata: {
        name: 'test-tool',
        version: '1.0.0',
        description: 'Test tool for integration',
        capabilities: ['testing']
      },
      schema: {
        input: {
          message: stringField({
            required: true,
            description: 'Test message'
          })
        },
        config: {
          prefix: configStringField({
            default: 'TEST:',
            description: 'Message prefix'
          })
        }
      },
      execute: async (input, config) => ({
        status: 'success',
        data: { result: `${config.prefix} ${input.message}` }
      })
    });

    // Configure tool
    await tool.configure({ prefix: 'INTEGRATION:' });

    // Execute tool
    const result = await tool.execute(
      { message: 'Hello World' },
      { prefix: 'INTEGRATION:' }
    );

    expect(result.status).toBe('success');
    expect(result.data.result).toBe('INTEGRATION: Hello World');
  });
});
```

## Documentation Guidelines

### JSDoc Standards

```typescript
/**
 * Creates a comprehensive AI Spine tool with type safety and validation.
 * 
 * This is the primary factory function for creating tools that can be used
 * by AI agents. It provides comprehensive validation, type inference, and
 * intelligent defaults.
 * 
 * @template TInput - The input data type for the tool (inferred from schema)
 * @template TConfig - The configuration type for the tool (inferred from schema)
 * 
 * @param options - Complete tool configuration options
 * @param options.metadata - Tool identification and capability metadata
 * @param options.schema - Input and configuration validation schema
 * @param options.execute - Main tool execution function
 * @param options.setup - Optional setup function called during configuration
 * @param options.cleanup - Optional cleanup function called when tool stops
 * @param options.healthCheck - Optional health check for monitoring
 * 
 * @returns A fully configured Tool instance ready to be started
 * 
 * @throws {ConfigurationError} When tool definition is invalid
 * @throws {ValidationError} When schema validation fails
 * 
 * @example
 * Basic tool creation:
 * ```typescript
 * const echoTool = createTool({
 *   metadata: {
 *     name: 'echo-tool',
 *     version: '1.0.0',
 *     description: 'Simple echo tool',
 *     capabilities: ['echo']
 *   },
 *   schema: {
 *     input: {
 *       message: stringField({
 *         required: true,
 *         description: 'Message to echo'
 *       })
 *     },
 *     config: {}
 *   },
 *   execute: async (input, config, context) => ({
 *     status: 'success',
 *     data: { echo: input.message }
 *   })
 * });
 * ```
 * 
 * @example
 * Advanced tool with full configuration:
 * ```typescript
 * const advancedTool = createTool({
 *   metadata: {
 *     name: 'advanced-tool',
 *     version: '2.1.0',
 *     description: 'Advanced tool with comprehensive features',
 *     capabilities: ['processing', 'validation', 'monitoring'],
 *     author: 'AI Spine Team',
 *     tags: ['advanced', 'production-ready']
 *   },
 *   schema: {
 *     input: {
 *       data: objectField({
 *         id: stringField({ required: true, pattern: '^[A-Z0-9]{8}$' }),
 *         items: arrayField(stringField(), { maxItems: 100 })
 *       }, { required: true })
 *     },
 *     config: {
 *       apiKey: apiKeyField({ required: true, envVar: 'API_KEY' }),
 *       timeout: configNumberField({ default: 30000, min: 1000, max: 60000 })
 *     }
 *   },
 *   execute: async (input, config, context) => {
 *     // Implementation with error handling
 *     try {
 *       const result = await processData(input.data, config);
 *       return { status: 'success', data: result };
 *     } catch (error) {
 *       return {
 *         status: 'error',
 *         error: {
 *           code: 'PROCESSING_FAILED',
 *           message: error.message,
 *           type: 'execution_error',
 *           retryable: isRetryableError(error)
 *         }
 *       };
 *     }
 *   },
 *   setup: async (config) => {
 *     await validateApiConnection(config.apiKey);
 *   },
 *   cleanup: async () => {
 *     await closeConnections();
 *   },
 *   healthCheck: async () => ({
 *     status: 'healthy',
 *     details: { connections: getConnectionCount() }
 *   })
 * });
 * ```
 * 
 * @see {@link Tool} for the returned tool instance API
 * @see {@link ToolDefinition} for the complete tool definition interface
 * @see {@link ToolBuilder} for alternative fluent API approach
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
export function createTool<TInput extends ToolInput = ToolInput, TConfig extends ToolConfig = ToolConfig>(
  options: CreateToolOptions<TInput, TConfig>
): Tool<TInput, TConfig>
```

### Documentation Site Content

When adding documentation:

1. **Use Clear Structure**
   - Start with overview and key concepts
   - Provide working code examples
   - Include troubleshooting sections
   - Add related links and next steps

2. **Example-Driven Approach**
   ```markdown
   ## Creating String Fields

   String fields are the most common input type for AI tools. They support comprehensive validation including length constraints, format validation, and enumeration values.

   ### Basic String Field

   ```typescript
   const nameField = stringField({
     required: true,
     description: 'User full name',
     minLength: 2,
     maxLength: 100,
     example: 'John Smith'
   });
   ```

   ### Email Validation

   ```typescript
   const emailField = stringField({
     required: true,
     format: 'email',
     description: 'User email address',
     example: 'user@example.com'
   });
   ```
   ```

3. **Cross-Reference Related Content**
   - Link to related API documentation
   - Reference examples and tutorials
   - Include troubleshooting links

## Community

### Getting Help

- **Documentation**: Start with our comprehensive documentation
- **GitHub Discussions**: Ask questions and share ideas
- **Discord Community**: Join real-time discussions (invite link in README)
- **GitHub Issues**: Report bugs and request features
- **Stack Overflow**: Tag questions with `ai-spine-tools`

### Communication Guidelines

1. **Be Respectful**: Treat all community members with respect
2. **Be Patient**: Maintainers and contributors volunteer their time
3. **Be Constructive**: Provide actionable feedback and suggestions
4. **Be Inclusive**: Welcome newcomers and different perspectives
5. **Be Professional**: Keep discussions focused and professional

### Recognition

Contributors are recognized in several ways:

- **Contributors Section**: Added to project README
- **Release Notes**: Significant contributions mentioned in releases
- **Community Showcase**: Featured tools and contributions highlighted
- **Special Badges**: GitHub profile badges for significant contributors

### Becoming a Maintainer

Active contributors may be invited to become maintainers. Maintainer responsibilities include:

- Reviewing and merging pull requests
- Helping with issue triage and support
- Participating in project direction discussions
- Mentoring new contributors

Maintainers are expected to:

- Follow the same contribution guidelines
- Be responsive to community needs
- Maintain project quality standards
- Foster an inclusive community environment

## Questions?

If you have questions about contributing that aren't covered in this guide:

1. Check our [FAQ](./faq.md)
2. Search [existing discussions](https://github.com/ai-spine/tools-sdk/discussions)
3. Join our [Discord community](https://discord.gg/ai-spine-tools)
4. Open a [new discussion](https://github.com/ai-spine/tools-sdk/discussions/new)

Thank you for contributing to AI Spine Tools SDK! 🎉

---

**Related Documentation:**
- [Code of Conduct](./code-of-conduct.md)
- [Issue Templates](./issue-templates.md)
- [Community Examples](./examples.md)
- [Development Setup](../getting-started/installation.md)