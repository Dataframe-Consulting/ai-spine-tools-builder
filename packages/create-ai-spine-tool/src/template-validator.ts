/**
 * Template validation system for AI Spine tools.
 * 
 * This module provides comprehensive validation for template files,
 * ensuring that generated code is syntactically correct, follows
 * best practices, and matches the expected structure.
 * 
 * @fileoverview Template validation implementation
 * @author AI Spine Team
 * @since 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import mustache from 'mustache';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { TemplateType, Language, TemplateContext, CreateToolOptions } from './types';

/**
 * Validation result for template processing
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Array of validation errors found */
  errors: ValidationError[];
  /** Array of warnings (non-blocking issues) */
  warnings: ValidationWarning[];
  /** Execution time for validation in milliseconds */
  validationTimeMs: number;
  /** Files that were validated */
  validatedFiles: string[];
}

/**
 * Validation error with context and suggestions
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** File path where the error occurred */
  file?: string;
  /** Line number if applicable */
  line?: number;
  /** Column number if applicable */
  column?: number;
  /** Suggested fix for the error */
  suggestion?: string;
  /** Severity level */
  severity: 'error' | 'warning';
}

/**
 * Validation warning (non-blocking)
 */
export type ValidationWarning = Omit<ValidationError, 'severity'> & { severity: 'warning' };

/**
 * Template validation configuration
 */
export interface ValidationConfig {
  /** Whether to validate TypeScript syntax */
  validateTypeScript: boolean;
  /** Whether to validate package.json structure */
  validatePackageJson: boolean;
  /** Whether to validate mustache template syntax */
  validateTemplates: boolean;
  /** Whether to run tests after generation */
  runTests: boolean;
  /** Maximum time to wait for validation (ms) */
  timeoutMs: number;
  /** Whether to perform strict validation */
  strict: boolean;
}

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  validateTypeScript: true,
  validatePackageJson: true,
  validateTemplates: true,
  runTests: true,
  timeoutMs: 30000,
  strict: true,
};

/**
 * Template validator class that handles all validation operations.
 * 
 * This class provides comprehensive validation for templates including:
 * - Mustache template syntax validation
 * - Generated TypeScript code validation
 * - Package.json structure validation
 * - Test file validation
 * - Best practices checking
 */
export class TemplateValidator {
  private config: ValidationConfig;

  /**
   * Creates a new template validator with the specified configuration.
   * 
   * @param config - Validation configuration (uses defaults if not provided)
   */
  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Validates a complete template by processing it and checking the generated output.
   * 
   * This is the main validation entry point that orchestrates all validation steps:
   * 1. Template syntax validation
   * 2. Context variable validation
   * 3. Generated code validation
   * 4. Package structure validation
   * 
   * @param templateType - Type of template to validate
   * @param language - Programming language for the template
   * @param context - Template context for variable substitution
   * @param templatesDir - Directory containing template files
   * @returns Promise resolving to validation results
   * 
   * @example
   * ```typescript
   * const validator = new TemplateValidator();
   * const result = await validator.validateTemplate('basic', 'typescript', context, templatesDir);
   * if (!result.isValid) {
   *   console.error('Template validation failed:', result.errors);
   * }
   * ```
   */
  async validateTemplate(
    templateType: TemplateType,
    language: Language,
    context: TemplateContext,
    templatesDir: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validatedFiles: string[] = [];

    try {
      const templateDir = path.join(templatesDir, templateType, language);
      
      if (!(await fs.pathExists(templateDir))) {
        errors.push({
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template directory not found: ${templateDir}`,
          severity: 'error',
          suggestion: `Ensure the template ${templateType}/${language} exists`,
        });
        
        return {
          isValid: false,
          errors,
          warnings,
          validationTimeMs: Date.now() - startTime,
          validatedFiles,
        };
      }

      // Validate template structure
      await this.validateTemplateStructure(templateDir, templateType, errors, warnings);

      // Validate template syntax and mustache expressions
      if (this.config.validateTemplates) {
        await this.validateTemplateSyntax(templateDir, context, errors, warnings, validatedFiles);
      }

      // Validate generated content
      if (this.config.validateTypeScript && language === 'typescript') {
        await this.validateGeneratedTypeScript(templateDir, context, errors, warnings, validatedFiles);
      }

      // Validate package.json structure
      if (this.config.validatePackageJson) {
        await this.validatePackageJsonTemplate(templateDir, context, errors, warnings, validatedFiles);
      }

      // Validate common files
      const commonDir = path.join(templatesDir, 'common');
      if (await fs.pathExists(commonDir)) {
        await this.validateTemplateSyntax(commonDir, context, errors, warnings, validatedFiles);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        validationTimeMs: Date.now() - startTime,
        validatedFiles,
      };
    } catch (error) {
      errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: `Validation failed with exception: ${(error as Error).message}`,
        severity: 'error',
      });

      return {
        isValid: false,
        errors,
        warnings,
        validationTimeMs: Date.now() - startTime,
        validatedFiles,
      };
    }
  }

  /**
   * Validates that a generated tool project is functional by creating a temporary
   * instance and running basic tests.
   * 
   * @param options - Tool creation options to test
   * @param templatesDir - Directory containing templates
   * @returns Promise resolving to validation results
   */
  async validateGeneratedProject(
    options: CreateToolOptions,
    templatesDir: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validatedFiles: string[] = [];

    const tempDir = path.join(require('os').tmpdir(), `ai-spine-test-${Date.now()}`);
    
    try {
      // Generate template context
      const context = this.generateTestContext(options);

      // Create temporary project
      await this.createTemporaryProject(tempDir, options, context, templatesDir);

      // Validate TypeScript compilation
      if (this.config.validateTypeScript) {
        await this.validateProjectCompilation(tempDir, errors, warnings);
      }

      // Run tests if enabled
      if (this.config.runTests && options.includeTests) {
        await this.validateProjectTests(tempDir, errors, warnings);
      }

      validatedFiles.push(...(await this.getProjectFiles(tempDir)));

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        validationTimeMs: Date.now() - startTime,
        validatedFiles,
      };
    } finally {
      // Clean up temporary directory
      try {
        await fs.remove(tempDir);
      } catch (cleanupError) {
        warnings.push({
          code: 'CLEANUP_WARNING',
          message: `Failed to clean up temporary directory: ${(cleanupError as Error).message}`,
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validates the basic structure and required files of a template.
   * 
   * @private
   */
  private async validateTemplateStructure(
    templateDir: string,
    templateType: TemplateType,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const requiredFiles = ['src/index.ts', 'package.json'];
    
    // Template-specific required files
    if (templateType === 'api-integration') {
      // API integration templates might need additional files
    } else if (templateType === 'data-processing') {
      // Data processing templates might need additional files
    }

    for (const file of requiredFiles) {
      const filePath = path.join(templateDir, file);
      if (!(await fs.pathExists(filePath))) {
        errors.push({
          code: 'MISSING_REQUIRED_FILE',
          message: `Required template file missing: ${file}`,
          file: filePath,
          severity: 'error',
          suggestion: `Create the missing file: ${file}`,
        });
      }
    }

    // Check for common issues
    const srcDir = path.join(templateDir, 'src');
    if (await fs.pathExists(srcDir)) {
      const files = await fs.readdir(srcDir);
      if (files.length === 0) {
        warnings.push({
          code: 'EMPTY_SRC_DIR',
          message: 'Source directory is empty',
          file: srcDir,
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validates mustache template syntax and variable usage.
   * 
   * @private
   */
  private async validateTemplateSyntax(
    templateDir: string,
    context: TemplateContext,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    validatedFiles: string[]
  ): Promise<void> {
    const files = await this.getTemplateFiles(templateDir);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        validatedFiles.push(file);

        // Validate mustache syntax
        try {
          mustache.parse(content);
        } catch (parseError) {
          errors.push({
            code: 'MUSTACHE_SYNTAX_ERROR',
            message: `Template syntax error: ${(parseError as Error).message}`,
            file,
            severity: 'error',
            suggestion: 'Check mustache template syntax and ensure all tags are properly closed',
          });
          continue;
        }

        // Try rendering with context to catch missing variables
        try {
          mustache.render(content, context);
        } catch (renderError) {
          const message = (renderError as Error).message;
          if (message.includes('Cannot read property') || message.includes('is not defined')) {
            warnings.push({
              code: 'MISSING_TEMPLATE_VARIABLE',
              message: `Possible missing template variable: ${message}`,
              file,
              severity: 'warning',
              suggestion: 'Ensure all template variables are defined in the context',
            });
          } else {
            errors.push({
              code: 'TEMPLATE_RENDER_ERROR',
              message: `Template rendering failed: ${message}`,
              file,
              severity: 'error',
            });
          }
        }

        // Check for common template issues
        await this.validateTemplateContent(content, file, errors, warnings);

      } catch (error) {
        errors.push({
          code: 'FILE_READ_ERROR',
          message: `Failed to read template file: ${(error as Error).message}`,
          file,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validates generated TypeScript code for syntax and compilation errors.
   * 
   * @private
   */
  private async validateGeneratedTypeScript(
    templateDir: string,
    context: TemplateContext,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    validatedFiles: string[]
  ): Promise<void> {
    const tsFiles = await this.getTypeScriptFiles(templateDir);

    for (const file of tsFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const renderedContent = mustache.render(content, context);
        validatedFiles.push(file);

        // Basic syntax validation
        await this.validateTypeScriptSyntax(renderedContent, file, errors, warnings);

        // Check for common TypeScript issues
        await this.validateTypeScriptContent(renderedContent, file, errors, warnings);

      } catch (error) {
        errors.push({
          code: 'TS_VALIDATION_ERROR',
          message: `TypeScript validation failed: ${(error as Error).message}`,
          file,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validates package.json template structure and dependencies.
   * 
   * @private
   */
  private async validatePackageJsonTemplate(
    templateDir: string,
    context: TemplateContext,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    validatedFiles: string[]
  ): Promise<void> {
    const packageJsonPath = path.join(templateDir, 'package.json');
    
    if (!(await fs.pathExists(packageJsonPath))) {
      errors.push({
        code: 'MISSING_PACKAGE_JSON',
        message: 'package.json template not found',
        file: packageJsonPath,
        severity: 'error',
      });
      return;
    }

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const renderedContent = mustache.render(content, context);
      validatedFiles.push(packageJsonPath);

      // Validate JSON structure
      let packageJson: any;
      try {
        packageJson = JSON.parse(renderedContent);
      } catch (parseError) {
        errors.push({
          code: 'INVALID_PACKAGE_JSON',
          message: `package.json is not valid JSON: ${(parseError as Error).message}`,
          file: packageJsonPath,
          severity: 'error',
          suggestion: 'Ensure package.json template generates valid JSON',
        });
        return;
      }

      // Validate required fields
      const requiredFields = ['name', 'version', 'description', 'main', 'scripts', 'dependencies'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          errors.push({
            code: 'MISSING_PACKAGE_FIELD',
            message: `Required field missing in package.json: ${field}`,
            file: packageJsonPath,
            severity: 'error',
          });
        }
      }

      // Validate scripts
      if (packageJson.scripts) {
        const requiredScripts = ['dev', 'build', 'start'];
        for (const script of requiredScripts) {
          if (!packageJson.scripts[script]) {
            warnings.push({
              code: 'MISSING_SCRIPT',
              message: `Recommended script missing: ${script}`,
              file: packageJsonPath,
              severity: 'warning',
            });
          }
        }
      }

      // Validate dependencies
      if (packageJson.dependencies && !packageJson.dependencies['@ai-spine/tools']) {
        errors.push({
          code: 'MISSING_CORE_DEPENDENCY',
          message: 'Missing core dependency: @ai-spine/tools',
          file: packageJsonPath,
          severity: 'error',
        });
      }

    } catch (error) {
      errors.push({
        code: 'PACKAGE_JSON_VALIDATION_ERROR',
        message: `package.json validation failed: ${(error as Error).message}`,
        file: packageJsonPath,
        severity: 'error',
      });
    }
  }

  /**
   * Validates template content for common issues and best practices.
   * 
   * @private
   */
  private async validateTemplateContent(
    content: string,
    file: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for potential variable naming issues
    const variablePattern = /\{\{\{?(\w+)\}?\}\}/g;
    const matches = content.match(variablePattern);
    
    if (matches) {
      for (const match of matches) {
        const variableName = match.replace(/[{}]/g, '');
        
        // Check for JavaScript reserved words that might cause issues
        const reservedWords = ['function', 'var', 'let', 'const', 'class', 'return', 'if', 'else'];
        if (reservedWords.includes(variableName)) {
          warnings.push({
            code: 'RESERVED_WORD_VARIABLE',
            message: `Template variable uses reserved word: ${variableName}`,
            file,
            severity: 'warning',
            suggestion: `Consider renaming template variable: ${variableName}`,
          });
        }

        // Check for potential naming convention violations
        if (variableName.includes('-') && !variableName.includes('kebab')) {
          warnings.push({
            code: 'NAMING_CONVENTION',
            message: `Variable name contains hyphens: ${variableName}`,
            file,
            severity: 'warning',
            suggestion: 'Consider using camelCase or adding Case suffix for case variants',
          });
        }
      }
    }

    // Check for potential security issues
    if (content.includes('eval(') || content.includes('Function(')) {
      warnings.push({
        code: 'SECURITY_WARNING',
        message: 'Template contains potentially unsafe code execution',
        file,
        severity: 'warning',
        suggestion: 'Avoid using eval() or Function() in generated code',
      });
    }
  }

  /**
   * Validates TypeScript syntax of rendered content.
   * 
   * @private
   */
  private async validateTypeScriptSyntax(
    content: string,
    file: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Basic syntax checks
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for common syntax issues
      if (line.includes('{{') || line.includes('}}')) {
        warnings.push({
          code: 'UNRESOLVED_TEMPLATE',
          message: 'Unresolved mustache template found in generated content',
          file,
          line: lineNumber,
          severity: 'warning',
          suggestion: 'Ensure all template variables are defined in context',
        });
      }

      // Check for invalid variable names
      const invalidVarPattern = /(?:const|let|var)\s+([^a-zA-Z_$][a-zA-Z0-9_$]*)/;
      const match = line.match(invalidVarPattern);
      if (match) {
        errors.push({
          code: 'INVALID_VARIABLE_NAME',
          message: `Invalid JavaScript variable name: ${match[1]}`,
          file,
          line: lineNumber,
          severity: 'error',
          suggestion: 'Variable names must start with letter, underscore, or dollar sign',
        });
      }
    }
  }

  /**
   * Validates TypeScript content for common issues.
   * 
   * @private
   */
  private async validateTypeScriptContent(
    content: string,
    file: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for import statements
    if (!content.includes('import') && content.includes('createTool')) {
      errors.push({
        code: 'MISSING_IMPORT',
        message: 'Missing import statement for createTool',
        file,
        severity: 'error',
        suggestion: "Add: import { createTool } from '@ai-spine/tools';",
      });
    }

    // Check for proper export
    if (!content.includes('export default') && !content.includes('export {')) {
      warnings.push({
        code: 'NO_EXPORT',
        message: 'No default export found',
        file,
        severity: 'warning',
        suggestion: 'Consider adding export default for the tool',
      });
    }

    // Check for async/await usage
    if (content.includes('async') && !content.includes('await')) {
      warnings.push({
        code: 'UNUSED_ASYNC',
        message: 'Function marked as async but no await found',
        file,
        severity: 'warning',
      });
    }
  }

  /**
   * Creates a temporary project for validation testing.
   * 
   * @private
   */
  private async createTemporaryProject(
    tempDir: string,
    options: CreateToolOptions,
    context: TemplateContext,
    templatesDir: string
  ): Promise<void> {
    await fs.ensureDir(tempDir);

    // Copy template files
    const templateDir = path.join(templatesDir, options.template, options.language);
    const commonDir = path.join(templatesDir, 'common');

    // Process template files
    await this.copyAndProcessFiles(templateDir, tempDir, context);
    
    if (await fs.pathExists(commonDir)) {
      await this.copyAndProcessFiles(commonDir, tempDir, context);
    }
  }

  /**
   * Validates that the generated project compiles without errors.
   * 
   * @private
   */
  private async validateProjectCompilation(
    projectDir: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      // Check if TypeScript is available
      execSync('npx tsc --version', { cwd: projectDir, stdio: 'ignore' });
      
      // Try to compile the project
      execSync('npx tsc --noEmit', { 
        cwd: projectDir, 
        stdio: 'pipe',
        timeout: this.config.timeoutMs 
      });
    } catch (error) {
      const message = (error as any).stdout?.toString() || (error as Error).message;
      errors.push({
        code: 'COMPILATION_ERROR',
        message: `TypeScript compilation failed: ${message}`,
        severity: 'error',
        suggestion: 'Fix TypeScript errors in template files',
      });
    }
  }

  /**
   * Validates that the generated project tests pass.
   * 
   * @private
   */
  private async validateProjectTests(
    projectDir: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      // Install dependencies first
      execSync('npm install', { 
        cwd: projectDir, 
        stdio: 'ignore',
        timeout: this.config.timeoutMs 
      });
      
      // Run tests
      execSync('npm test', { 
        cwd: projectDir, 
        stdio: 'pipe',
        timeout: this.config.timeoutMs 
      });
    } catch (error) {
      const message = (error as any).stdout?.toString() || (error as Error).message;
      warnings.push({
        code: 'TEST_FAILURE',
        message: `Tests failed: ${message}`,
        severity: 'warning',
        suggestion: 'Review and fix test files in template',
      });
    }
  }

  /**
   * Copies and processes template files with mustache rendering.
   * 
   * @private
   */
  private async copyAndProcessFiles(
    sourceDir: string,
    targetDir: string,
    context: TemplateContext
  ): Promise<void> {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const file of files) {
      const sourcePath = path.join(sourceDir, file.name);
      const targetPath = path.join(targetDir, file.name);

      if (file.isDirectory()) {
        await fs.ensureDir(targetPath);
        await this.copyAndProcessFiles(sourcePath, targetPath, context);
      } else {
        const content = await fs.readFile(sourcePath, 'utf-8');
        const processedContent = mustache.render(content, context);
        await fs.writeFile(targetPath, processedContent);
      }
    }
  }

  /**
   * Generates test context for validation.
   * 
   * @private
   */
  private generateTestContext(options: CreateToolOptions): TemplateContext {
    return {
      toolName: options.name,
      toolNamePascalCase: this.toPascalCase(options.name),
      toolNameKebabCase: this.toKebabCase(options.name),
      toolNameCamelCase: this.toCamelCase(options.name),
      description: options.description || 'Test tool for validation',
      language: options.language,
      includeTests: options.includeTests,
      includeDocker: options.includeDocker,
      packageName: options.name,
      year: new Date().getFullYear(),
      dependencies: [
        { key: '@ai-spine/tools', value: '^1.0.0', isLast: true },
      ],
      devDependencies: [
        { key: 'typescript', value: '^5.0.0', isLast: false },
        { key: '@types/node', value: '^20.0.0', isLast: true },
      ],
    };
  }

  /**
   * Gets all template files in a directory.
   * 
   * @private
   */
  private async getTemplateFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function walkDir(currentDir: string): Promise<void> {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }
    
    if (await fs.pathExists(dir)) {
      await walkDir(dir);
    }
    
    return files;
  }

  /**
   * Gets all TypeScript files in a directory.
   * 
   * @private
   */
  private async getTypeScriptFiles(dir: string): Promise<string[]> {
    const allFiles = await this.getTemplateFiles(dir);
    return allFiles.filter(file => file.endsWith('.ts'));
  }

  /**
   * Gets all project files for validation reporting.
   * 
   * @private
   */
  private async getProjectFiles(dir: string): Promise<string[]> {
    return await this.getTemplateFiles(dir);
  }

  // Utility methods for string case conversion
  private toPascalCase(str: string): string {
    return str
      .replace(/[\s\-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^(.)/, (char) => char.toUpperCase());
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[\s\-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^(.)/, (char) => char.toLowerCase());
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}

/**
 * Convenience function to validate a template with default configuration.
 * 
 * @param templateType - Type of template to validate
 * @param language - Programming language for the template
 * @param context - Template context for variable substitution
 * @param templatesDir - Directory containing template files
 * @returns Promise resolving to validation results
 */
export async function validateTemplate(
  templateType: TemplateType,
  language: Language,
  context: TemplateContext,
  templatesDir: string
): Promise<ValidationResult> {
  const validator = new TemplateValidator();
  return await validator.validateTemplate(templateType, language, context, templatesDir);
}

/**
 * Convenience function to validate a generated project with default configuration.
 * 
 * @param options - Tool creation options to test
 * @param templatesDir - Directory containing templates
 * @returns Promise resolving to validation results
 */
export async function validateGeneratedProject(
  options: CreateToolOptions,
  templatesDir: string
): Promise<ValidationResult> {
  const validator = new TemplateValidator();
  return await validator.validateGeneratedProject(options, templatesDir);
}

/**
 * Prints validation results to console with colored output.
 * 
 * @param result - Validation result to display
 * @param verbose - Whether to show detailed information
 */
export function printValidationResult(result: ValidationResult, verbose: boolean = false): void {
  console.log();
  
  if (result.isValid) {
    console.log(chalk.green.bold('✅ Template validation passed!'));
  } else {
    console.log(chalk.red.bold('❌ Template validation failed!'));
  }
  
  console.log(chalk.gray(`Validation completed in ${result.validationTimeMs}ms`));
  console.log(chalk.gray(`Validated ${result.validatedFiles.length} files`));
  
  if (result.errors.length > 0) {
    console.log();
    console.log(chalk.red.bold(`Errors (${result.errors.length}):`));
    
    for (const error of result.errors) {
      console.log(chalk.red(`  • ${error.code}: ${error.message}`));
      
      if (error.file) {
        const location = error.line ? ` (line ${error.line})` : '';
        console.log(chalk.gray(`    File: ${error.file}${location}`));
      }
      
      if (error.suggestion) {
        console.log(chalk.yellow(`    💡 ${error.suggestion}`));
      }
    }
  }
  
  if (result.warnings.length > 0) {
    console.log();
    console.log(chalk.yellow.bold(`Warnings (${result.warnings.length}):`));
    
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  • ${warning.code}: ${warning.message}`));
      
      if (warning.file && verbose) {
        const location = warning.line ? ` (line ${warning.line})` : '';
        console.log(chalk.gray(`    File: ${warning.file}${location}`));
      }
    }
  }
  
  if (verbose && result.validatedFiles.length > 0) {
    console.log();
    console.log(chalk.bold('Validated files:'));
    for (const file of result.validatedFiles) {
      console.log(chalk.gray(`  • ${file}`));
    }
  }
  
  console.log();
}