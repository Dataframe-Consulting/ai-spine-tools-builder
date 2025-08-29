/**
 * Prettier configuration for MyFirstTool - for testng
 * 
 * This configuration ensures consistent code formatting across the project.
 * It follows modern JavaScript/TypeScript formatting standards and integrates
 * seamlessly with ESLint for comprehensive code quality.
 * 
 * Generated on 2025-08-28 using create-ai-spine-tool v1.0.0
 * Template: , Language: typescript
 */

module.exports = {
  // Basic formatting options
  semi: true,                    // Use semicolons
  trailingComma: 'es5',         // Trailing commas for ES5 compatibility
  singleQuote: true,            // Use single quotes instead of double quotes
  quoteProps: 'as-needed',      // Only quote properties when necessary
  
  // Indentation and spacing
  tabWidth: 2,                  // 2 spaces per tab
  useTabs: false,               // Use spaces instead of tabs
  printWidth: 100,              // Line width limit
  
  // JavaScript/TypeScript specific
  bracketSpacing: true,         // Spaces inside object literals
  bracketSameLine: false,       // Put closing bracket on new line
  arrowParens: 'avoid',         // Avoid parentheses around single parameter
  
  // Semicolons and quotes in different contexts
  jsxSingleQuote: true,         // Use single quotes in JSX (if applicable)
  
  // End of line characters
  endOfLine: 'lf',              // Use LF line endings for cross-platform compatibility
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // HTML whitespace sensitivity (if applicable)
  htmlWhitespaceSensitivity: 'css',
  
  // Markdown prose wrap
  proseWrap: 'preserve',
  
  // Override specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.ts',
      options: {
        parser: 'typescript',
        printWidth: 100,
        tabWidth: 2
      }
    },
    // Configuration files often have longer lines
    {
      files: ['*.config.js', '*.config.ts', '.eslintrc.js'],
      options: {
        printWidth: 120
      }
    },
    // Package.json formatting
    {
      files: 'package.json',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    }
  ]
};