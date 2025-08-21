# Contributing to AI Spine Tools SDK

Thank you for your interest in contributing to the AI Spine Tools SDK! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Basic knowledge of TypeScript and Node.js

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/ai-spine-tools-builder.git
   cd ai-spine-tools-builder
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Packages**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
ai-spine-tools-builder/
├── packages/
│   ├── ai-spine-tools-core/     # Core types and utilities
│   ├── ai-spine-tools/          # Main framework
│   ├── ai-spine-tools-testing/  # Testing utilities
│   └── create-ai-spine-tool/    # CLI scaffolding tool
├── templates/                   # Tool templates
├── examples/                    # Example tools
├── docs/                        # Documentation
└── scripts/                     # Build and release scripts
```

## 🛠️ Development Workflow

### 1. Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run lint
   npm run build
   npm test
   ```

### 2. Code Standards

- **TypeScript**: Use strict TypeScript with proper type definitions
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code is automatically formatted
- **Testing**: Maintain >90% test coverage
- **Documentation**: Update docs for any public API changes

### 3. Commit Guidelines

Use conventional commit messages:

```
type(scope): description

Examples:
feat(core): add new validation type
fix(cli): handle missing template directory
docs(readme): update installation instructions
test(tools): add integration tests
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `style`: Code style changes
- `chore`: Build/tooling changes

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run specific package tests
npm test --workspace @ai-spine/tools

# Run template validation
npm run test:templates

# Run example validation
npm run test:examples
```

### Writing Tests

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test package interactions
3. **Template Tests**: Validate generated tools work correctly
4. **Example Tests**: Ensure example tools function properly

Example test structure:

```typescript
import { createTool, stringField } from '@ai-spine/tools';
import { testTool, generateTestData } from '@ai-spine/tools-testing';

describe('MyTool', () => {
  let tool;

  beforeEach(() => {
    tool = createTool({
      // Tool configuration
    });
  });

  it('should process valid input', async () => {
    const response = await testTool(tool.getApp(), {
      field: 'test value',
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });
});
```

## 📝 Documentation

### Types of Documentation

1. **API Documentation**: JSDoc comments for all public APIs
2. **README Files**: Package and example READMEs
3. **Guides**: Step-by-step tutorials
4. **Examples**: Working code examples

### Writing Documentation

- Use clear, concise language
- Provide working code examples
- Include error handling examples
- Update docs with any API changes

## 🎯 Contribution Areas

### High Priority

1. **New Field Types**: Add support for additional validation types
2. **Tool Templates**: Create new templates for common use cases
3. **Example Tools**: Build more comprehensive examples
4. **Testing Utilities**: Enhance testing framework
5. **Documentation**: Improve guides and tutorials

### Medium Priority

1. **Performance Optimizations**: Improve build and runtime performance
2. **Error Messages**: Make error messages more helpful
3. **Developer Experience**: Improve tooling and debugging
4. **Integration Tests**: Add more comprehensive testing

### Future Enhancements

1. **Multi-language Support**: Python, Go, Rust SDKs
2. **Visual Builder**: GUI for creating tools
3. **Marketplace Integration**: Tool discovery and sharing
4. **Advanced Features**: Workflow composition, monitoring

## 🔄 Pull Request Process

### Before Submitting

1. **Check Issues**: Link to relevant issues
2. **Run Tests**: Ensure all tests pass
3. **Update Docs**: Update relevant documentation
4. **Test Examples**: Verify examples still work
5. **Check Templates**: Validate template generation

### PR Requirements

1. **Clear Description**: Explain what and why
2. **Test Coverage**: Include tests for new code
3. **Documentation**: Update docs if needed
4. **Breaking Changes**: Clearly document any breaking changes
5. **Examples**: Update examples if API changes

### Review Process

1. **Automated Checks**: CI must pass
2. **Code Review**: At least one maintainer review
3. **Testing**: Thorough testing of changes
4. **Documentation Review**: Docs must be accurate
5. **Final Approval**: Maintainer approval required

## 🐛 Bug Reports

### Before Reporting

1. **Search Issues**: Check if already reported
2. **Test Latest**: Try with latest version
3. **Minimal Reproduction**: Create minimal test case
4. **Environment Info**: Include system details

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.17.0]
- Package Version: [e.g., 1.0.0]

## Additional Context
Any other relevant information
```

## 💡 Feature Requests

### Before Requesting

1. **Check Roadmap**: See if already planned
2. **Search Issues**: Check if already requested
3. **Consider Scope**: Does it fit the project goals?

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How do you envision this working?

## Alternatives
What alternatives have you considered?

## Additional Context
Any other relevant information
```

## 🎨 Adding New Templates

### Template Structure

```
templates/
└── my-template/
    └── typescript/
        ├── package.json
        ├── src/
        │   └── index.ts
        ├── tests/
        │   └── tool.test.ts
        └── README.md
```

### Template Requirements

1. **Complete Functionality**: Template must work out of the box
2. **Documentation**: Include comprehensive README
3. **Tests**: Include test examples
4. **Best Practices**: Follow framework conventions
5. **Error Handling**: Include proper error handling

### Adding a Template

1. Create template directory structure
2. Use Mustache templating for variables
3. Add to CLI template options
4. Update documentation
5. Add validation tests

## 🏗️ Building and Releasing

### Local Development

```bash
# Build all packages
npm run build

# Watch for changes
npm run dev

# Test templates
npm run test:templates

# Test examples
npm run test:examples
```

### Release Process

1. **Version Update**: `npm run version patch|minor|major`
2. **Build and Test**: `npm run build && npm test`
3. **Push Changes**: `git push && git push --tags`
4. **GitHub Actions**: Automatically publishes to npm
5. **Manual Publish**: `npm run publish` (if needed)

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community chat
- **Discord**: Real-time chat (link in README)
- **Email**: maintainers@ai-spine.com

### Response Times

- **Critical Bugs**: Within 24 hours
- **Feature Requests**: Within 1 week
- **Questions**: Within 3 days
- **Pull Reviews**: Within 1 week

## 📜 Code of Conduct

### Our Standards

- **Be Respectful**: Treat everyone with respect
- **Be Inclusive**: Welcome diverse perspectives
- **Be Collaborative**: Work together constructively
- **Be Professional**: Maintain professional conduct

### Unacceptable Behavior

- Harassment or discrimination
- Disruptive behavior
- Spam or off-topic content
- Violation of others' privacy

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report issues to: conduct@ai-spine.com

## 🎉 Recognition

### Contributors

All contributors are recognized in:
- README contributors section
- Release notes
- Package metadata
- Annual contributor highlights

### Ways to Contribute

- **Code**: Features, fixes, improvements
- **Documentation**: Guides, examples, API docs
- **Testing**: Bug reports, test cases
- **Community**: Helping others, discussions
- **Design**: UI/UX improvements, graphics

Thank you for contributing to AI Spine Tools SDK! 🚀