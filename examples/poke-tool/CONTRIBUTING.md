# Contributing to MyFirstTool

Thank you for your interest in contributing to **MyFirstTool**! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

### Our Standards

- **Be respectful**: Treat everyone with respect and consideration
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be collaborative**: Work together towards common goals
- **Be constructive**: Provide helpful feedback and suggestions
- **Be professional**: Maintain a professional demeanor in all interactions

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version v22.18.0 or higher
- **npm**: Version 9.0.0 or higher
- **Git**: Latest stable version

### Project Structure

```
my-first-tool/
├── src/                    # Source code
│   ├── index.ts           # Main tool implementation
│   └── types.ts           # Type definitions (if applicable)
├── tests/                  # Test files
│   ├── setup.ts           # Test setup
│   └── tool.test.ts       # Main test suite
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.js         # ESLint configuration
├── .prettierrc.js       # Prettier configuration
├── nodemon.json         # Development server config
├── .env.example         # Environment variables template
└── README.md            # Project documentation
```

## 🔧 Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd my-first-tool
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Verify setup**:
   ```bash
   # Check health endpoint
   curl http://localhost:3000/health
   
   # View tool schema
   npm run schema
   ```

## 📝 Making Changes

### Branch Naming Convention

Use descriptive branch names that indicate the type of change:

- `feature/add-new-validation`
- `fix/handle-edge-case`
- `docs/update-readme`
- `refactor/improve-error-handling`
- `test/add-integration-tests`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat: add support for new input type`
- `fix: resolve validation error for edge case`
- `docs: update API documentation`
- `style: fix code formatting`
- `refactor: improve error handling logic`
- `test: add unit tests for validation`
- `chore: update dependencies`

### Code Style Guidelines

- **TypeScript**: Use TypeScript for all source code
- **Formatting**: Code is automatically formatted with Prettier
- **Linting**: Follow ESLint rules defined in `.eslintrc.js`
- **Naming**: Use camelCase for variables and functions, PascalCase for classes and types
- **Comments**: Use JSDoc for public APIs, inline comments for complex logic

### API Design Principles

1. **Consistency**: Follow existing patterns and conventions
2. **Type Safety**: Ensure all inputs and outputs are properly typed
3. **Error Handling**: Provide clear, actionable error messages
4. **Performance**: Consider performance implications of changes
5. **Backward Compatibility**: Avoid breaking changes when possible

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Test Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test tool endpoints and workflows
- **Performance Tests**: Validate performance requirements

### Writing Tests

```typescript
import request from 'supertest';
import myFirstToolTool from '../src/index';

describe('MyFirstTool Tool', () => {
  let app: any;

  beforeAll(async () => {
    app = myFirstToolTool.getApp();
  });

  afterAll(async () => {
    await myFirstToolTool.stop();
  });

  it('should handle valid input', async () => {
    const response = await request(app)
      .post('/execute')
      .send({
        input_data: {
          // Test data here
        }
      })
      .expect(200);

    expect(response.body.status).toBe('success');
  });
});
```

## ✅ Code Quality

### Quality Checks

Run quality checks before submitting:

```bash
# Type checking
npm run type-check

# Linting
npm run lint:check

# Formatting
npm run format:check

# All validations
npm run validate
```

### Pre-commit Hooks

The project uses pre-commit hooks to ensure code quality:

- **Lint**: Runs ESLint on staged files
- **Format**: Runs Prettier on staged files
- **Type Check**: Runs TypeScript compiler
- **Tests**: Runs relevant tests

### Performance Guidelines

- **Response Time**: Tool should respond in <200ms for simple operations
- **Memory Usage**: Keep memory usage <100MB under normal load
- **Error Handling**: All errors should be properly caught and handled
- **Resource Cleanup**: Clean up resources properly

## 📤 Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the guidelines above
3. **Write or update tests** for your changes
4. **Run quality checks** and ensure they pass
5. **Update documentation** if necessary
6. **Submit a pull request** with a clear description

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for changed functionality
- [ ] Integration tests updated if necessary

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or breaking changes documented)
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: Maintainer reviews code and provides feedback
3. **Testing**: Changes are tested in different environments
4. **Approval**: Changes are approved by maintainer
5. **Merge**: Changes are merged into main branch

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Release notes prepared

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, include:

- **Environment**: OS, Node.js version, npm version
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Error Messages**: Full error messages and stack traces
- **Additional Context**: Screenshots, logs, etc.

### Feature Requests

When requesting features, include:

- **Problem Description**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions considered
- **Use Cases**: Who would benefit from this feature?

## 📞 Getting Help

- **Documentation**: Check the README and API documentation first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Contact**: Reach out to maintainers for urgent matters

## 📜 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project ().

---

Thank you for contributing to MyFirstTool! 🎉