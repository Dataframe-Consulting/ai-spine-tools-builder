/**
 * Tool creation and template processing functionality.
 *
 * This module handles the actual creation of AI Spine tools from templates,
 * including file copying, template processing, dependency installation,
 * and git repository initialization.
 *
 * @fileoverview Tool creation implementation
 * @author AI Spine Team
 * @since 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import mustache from 'mustache';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import {
  CreateToolOptions,
  TemplateContext,
  TemplateType,
  Language,
} from './types';
import { TemplateValidator } from './template-validator';

/**
 * Creates a new AI Spine tool from the specified options and template.
 *
 * This is the main entry point for tool creation. It orchestrates the entire
 * process including directory creation, template processing, validation,
 * git initialization, and dependency installation.
 *
 * Features:
 * - Template validation and syntax checking
 * - Intelligent variable substitution with camelCase conversion
 * - TypeScript compilation validation
 * - Comprehensive error handling and reporting
 * - Optional project validation after creation
 *
 * @param options - Complete tool creation configuration
 * @param targetDir - Absolute path to the target directory where the tool will be created
 * @param validateTemplate - Whether to validate template before processing (default: true)
 * @throws {Error} When tool creation fails due to file system, network, or validation errors
 *
 * @example
 * ```typescript
 * await createTool({
 *   name: 'my-weather-tool',
 *   template: 'basic',
 *   language: 'typescript',
 *   includeTests: true,
 *   includeDocker: true,
 *   initGit: true,
 *   installDeps: true
 * }, '/path/to/my-weather-tool');
 * ```
 */
export async function createTool(
  options: CreateToolOptions,
  targetDir: string,
  validateTemplate: boolean = true
): Promise<void> {
  if (process.env.AI_SPINE_VERBOSE) {
    console.log(chalk.gray(`Creating tool "${options.name}" at ${targetDir}`));
  }

  // Create target directory
  await fs.ensureDir(targetDir);

  // Generate template context with all variable substitutions
  const context = generateTemplateContext(options);

  // Validate template before processing if enabled
  if (validateTemplate) {
    await validateTemplateBeforeProcessing(
      options.template,
      options.language,
      context
    );
  }

  // Copy and process template files with mustache templating
  await copyTemplate(options.template, options.language, targetDir, context);

  // Initialize git repository if requested
  if (options.initGit) {
    await initGitRepository(targetDir);
  }

  // Install dependencies automatically if requested
  if (options.installDeps) {
    await installDependencies(targetDir);
  }

  if (process.env.AI_SPINE_VERBOSE) {
    console.log(chalk.gray('Tool creation completed successfully'));
  }
}

/**
 * Generates the template context used for variable substitution in template files.
 *
 * This function creates all the variables that will be available in template files
 * during the mustache rendering process. It includes name transformations,
 * dependencies, and configuration based on the selected template and options.
 *
 * @param options - Tool creation options
 * @returns Complete template context with all substitution variables
 */
function generateTemplateContext(options: CreateToolOptions): TemplateContext {
  const toolNamePascalCase = toPascalCase(options.name);
  const toolNameKebabCase = toKebabCase(options.name);
  const toolNameCamelCase = toCamelCase(options.name);

  // Base dependencies
  const dependencies: Record<string, string> = {
    '@ai-spine/tools': '^1.0.0',
  };

  const devDependencies: Record<string, string> = {
    typescript: '^5.3.0',
    '@types/node': '^20.10.0',
    tsx: '^4.6.0',
    nodemon: '^3.0.2',
    rimraf: '^5.0.5',
  };

  // Add code quality tools
  devDependencies['eslint'] = '^8.55.0';
  devDependencies['@typescript-eslint/parser'] = '^6.14.0';
  devDependencies['@typescript-eslint/eslint-plugin'] = '^6.14.0';
  devDependencies['eslint-plugin-security'] = '^1.7.1';
  devDependencies['eslint-plugin-import'] = '^2.29.0';
  devDependencies['eslint-plugin-node'] = '^11.1.0';
  devDependencies['eslint-plugin-promise'] = '^6.1.1';
  devDependencies['eslint-plugin-unicorn'] = '^49.0.0';

  devDependencies['prettier'] = '^3.1.0';

  // TypeScript tools
  if (options.language === 'typescript') {
    devDependencies['@types/eslint'] = '^8.44.8';
    devDependencies['eslint-import-resolver-typescript'] = '^3.6.1';
  }

  // Template-specific dependencies (none for basic template)

  // Add test dependencies if tests are included
  if (options.includeTests) {
    devDependencies['jest'] = '^29.7.0';
    devDependencies['@types/jest'] = '^29.5.8';
    devDependencies['ts-jest'] = '^29.1.1';
    devDependencies['eslint-plugin-jest'] = '^27.6.0';
    devDependencies['supertest'] = '^6.3.3';
    devDependencies['@types/supertest'] = '^2.0.16';
  }

  // Convert dependency objects to arrays for Mustache iteration
  const dependencyArray = Object.entries(dependencies).map(
    ([key, value], index, array) => ({
      key,
      value,
      isLast: index === array.length - 1,
    })
  );

  const devDependencyArray = Object.entries(devDependencies).map(
    ([key, value], index, array) => ({
      key,
      value,
      isLast: index === array.length - 1,
    })
  );

  // Additional context for enhanced templating
  const currentDate = new Date();
  const isoDate = currentDate.toISOString().split('T')[0];
  const timestamp = currentDate.toISOString();

  return {
    toolName: options.name,
    toolNamePascalCase,
    toolNameKebabCase,
    toolNameCamelCase,
    description: options.description || 'An AI Spine tool',
    language: options.language,
    includeTests: options.includeTests,
    includeDocker: options.includeDocker,
    packageName: options.name,
    year: new Date().getFullYear(),
    date: isoDate,
    timestamp,
    nodeVersion: process.version,
    dependencies: dependencyArray,
    devDependencies: devDependencyArray,
    // Template-specific feature flags
    isBasicTemplate: options.template === 'basic',
    isTypeScript: options.language === 'typescript',
    isJavaScript: options.language === 'javascript',
  };
}

/**
 * Copies template files and processes them with mustache templating.
 *
 * This function handles the core template processing logic, including:
 * - Locating the appropriate template directory
 * - Processing template-specific files
 * - Processing common files shared across templates
 * - Variable substitution using mustache
 *
 * @param template - Template type to use
 * @param language - Programming language for the template
 * @param targetDir - Destination directory
 * @param context - Template context for variable substitution
 * @throws {Error} When template directory is not found
 */
async function copyTemplate(
  template: TemplateType,
  language: Language,
  targetDir: string,
  context: TemplateContext
): Promise<void> {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const templateDir = path.join(templatesDir, template, language);

  if (!(await fs.pathExists(templateDir))) {
    throw new Error(
      `Template not found: ${template}/${language}. Available templates: basic`
    );
  }

  if (process.env.AI_SPINE_VERBOSE) {
    console.log(chalk.gray(`Processing template: ${templateDir}`));
  }

  // Copy and process template-specific files
  await copyAndProcessFiles(templateDir, targetDir, context);

  // Copy common files shared across all templates
  const commonDir = path.join(templatesDir, 'common');
  if (await fs.pathExists(commonDir)) {
    if (process.env.AI_SPINE_VERBOSE) {
      console.log(chalk.gray(`Processing common files: ${commonDir}`));
    }
    await copyAndProcessFiles(commonDir, targetDir, context);
  }
}

/**
 * Recursively copies and processes files from source to target directory.
 *
 * This function handles the recursive directory traversal and file processing
 * with enhanced error handling and progress tracking. For each file, it:
 * - Reads the source content
 * - Applies mustache template processing with variable substitution
 * - Validates the generated content (optional)
 * - Writes the processed result to the target location
 * - Tracks processing statistics
 *
 * @param sourceDir - Source directory to copy from
 * @param targetDir - Target directory to copy to
 * @param context - Template context for mustache variable substitution
 * @param validateContent - Whether to validate processed content (default: true)
 */
async function copyAndProcessFiles(
  sourceDir: string,
  targetDir: string,
  context: TemplateContext,
  validateContent: boolean = true
): Promise<void> {
  const files = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file.name);
    const targetPath = path.join(targetDir, file.name);

    if (file.isDirectory()) {
      // Recursively process directories
      await fs.ensureDir(targetPath);
      await copyAndProcessFiles(sourcePath, targetPath, context);
    } else {
      // Process individual files with mustache templating
      try {
        const content = await fs.readFile(sourcePath, 'utf-8');

        // Apply mustache template processing
        const processedContent = mustache.render(content, context);

        // Optional content validation
        if (validateContent) {
          await validateProcessedContent(processedContent, sourcePath, context);
        }

        // Write processed content to target
        await fs.writeFile(targetPath, processedContent);

        // Set proper file permissions if executable
        if (
          sourcePath.includes('bin/') ||
          path.basename(sourcePath).startsWith('run-')
        ) {
          try {
            await fs.chmod(targetPath, 0o755);
          } catch (chmodError) {
            if (process.env.AI_SPINE_VERBOSE) {
              console.log(
                chalk.yellow(
                  `Warning: Could not set executable permissions on ${targetPath}`
                )
              );
            }
          }
        }

        if (process.env.AI_SPINE_VERBOSE) {
          console.log(
            chalk.gray(`  Processed: ${path.relative(targetDir, targetPath)}`)
          );
        }
      } catch (error) {
        throw new Error(
          `Failed to process file ${sourcePath}: ${(error as Error).message}`
        );
      }
    }
  }
}

/**
 * Initializes a git repository in the target directory.
 *
 * This function creates a new git repository, adds all files, and creates
 * an initial commit. It gracefully handles cases where git is not available
 * or the initialization fails.
 *
 * @param targetDir - Directory where the git repository should be initialized
 */
async function initGitRepository(targetDir: string): Promise<void> {
  const spinner = ora('Initializing git repository...').start();

  try {
    // Check if git is available
    execSync('git --version', { stdio: 'ignore' });

    // Initialize repository
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });

    // Configure git if no global config exists
    try {
      execSync('git config user.name', { cwd: targetDir, stdio: 'ignore' });
    } catch {
      execSync('git config user.name "AI Spine Tool Creator"', {
        cwd: targetDir,
        stdio: 'ignore',
      });
      execSync('git config user.email "noreply@ai-spine.com"', {
        cwd: targetDir,
        stdio: 'ignore',
      });
    }

    // Add all files and create initial commit
    execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
    execSync(
      'git commit -m "Initial commit: Created with create-ai-spine-tool"',
      { cwd: targetDir, stdio: 'ignore' }
    );

    spinner.succeed('Git repository initialized with initial commit');
  } catch (error) {
    spinner.warn('Failed to initialize git repository');

    if (process.env.AI_SPINE_VERBOSE) {
      console.log(
        chalk.yellow(`Git initialization error: ${(error as Error).message}`)
      );
      console.log(
        chalk.gray(
          'This is not critical and you can initialize git manually later'
        )
      );
    }
  }
}

/**
 * Installs npm dependencies for the newly created tool.
 *
 * This function runs npm install in the target directory to install all
 * dependencies specified in the generated package.json. It provides
 * helpful error messages if the installation fails.
 *
 * @param targetDir - Directory containing the package.json file
 */
async function installDependencies(targetDir: string): Promise<void> {
  const spinner = ora('Installing dependencies...').start();

  try {
    // Check if npm is available
    execSync('npm --version', { stdio: 'ignore' });

    if (process.env.AI_SPINE_VERBOSE) {
      // Use verbose npm install for debugging
      execSync('npm install --verbose', { cwd: targetDir, stdio: 'inherit' });
    } else {
      execSync('npm install', { cwd: targetDir, stdio: 'ignore' });
    }

    spinner.succeed('Dependencies installed successfully');
  } catch (error) {
    spinner.fail('Failed to install dependencies');

    console.log();
    console.log(
      chalk.yellow(
        '⚠️  Dependency installation failed. You can install them manually:'
      )
    );
    console.log(chalk.cyan(`  cd ${path.basename(targetDir)}`));
    console.log(chalk.cyan('  npm install'));
    console.log();

    if (process.env.AI_SPINE_VERBOSE) {
      console.log(chalk.gray(`Error details: ${(error as Error).message}`));
    }

    // Don't throw - tool creation should continue even if deps fail to install
  }
}

/**
 * Converts a string to PascalCase format.
 *
 * Used for generating class names and other identifiers that should follow
 * PascalCase naming conventions.
 *
 * @param str - Input string to convert
 * @returns String in PascalCase format
 *
 * @example
 * ```typescript
 * toPascalCase('my-weather-tool') // => 'MyWeatherTool'
 * toPascalCase('api_client') // => 'ApiClient'
 * ```
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[\s\-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, char => char.toUpperCase());
}

/**
 * Converts a string to camelCase format.
 *
 * Used for generating JavaScript variable names and identifiers
 * that should follow camelCase naming conventions.
 *
 * @param str - Input string to convert
 * @returns String in camelCase format
 *
 * @example
 * ```typescript
 * toCamelCase('test-tool') // => 'testTool'
 * toCamelCase('my-weather-tool') // => 'myWeatherTool'
 * toCamelCase('api_client') // => 'apiClient'
 * ```
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[\s\-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, char => char.toLowerCase());
}

/**
 * Converts a string to kebab-case format.
 *
 * Used for generating file names, directory names, and other identifiers
 * that should follow kebab-case naming conventions.
 *
 * @param str - Input string to convert
 * @returns String in kebab-case format
 *
 * @example
 * ```typescript
 * toKebabCase('MyWeatherTool') // => 'my-weather-tool'
 * toKebabCase('API_CLIENT') // => 'api-client'
 * ```
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Validates template before processing to catch issues early.
 *
 * This function performs pre-processing validation to ensure templates
 * are well-formed and can be successfully processed.
 *
 * @param templateType - Type of template to validate
 * @param language - Programming language for the template
 * @param context - Template context for variable substitution
 * @throws {Error} When template validation fails
 */
async function validateTemplateBeforeProcessing(
  templateType: TemplateType,
  language: Language,
  context: TemplateContext
): Promise<void> {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const validator = new TemplateValidator({
    validateTypeScript: language === 'typescript',
    validatePackageJson: true,
    validateTemplates: true,
    runTests: false, // Skip test execution during creation
    timeoutMs: 15000,
    strict: false, // Don't fail on warnings during creation
  });

  try {
    const result = await validator.validateTemplate(
      templateType,
      language,
      context,
      templatesDir
    );

    if (!result.isValid) {
      // Show validation errors but only fail on critical errors
      const criticalErrors = result.errors.filter(
        error =>
          error.code === 'TEMPLATE_NOT_FOUND' ||
          error.code === 'MUSTACHE_SYNTAX_ERROR' ||
          error.code === 'MISSING_REQUIRED_FILE'
      );

      if (criticalErrors.length > 0) {
        console.error(
          chalk.red.bold('❌ Critical template validation errors found:')
        );
        for (const error of criticalErrors) {
          console.error(chalk.red(`  • ${error.message}`));
          if (error.suggestion) {
            console.error(chalk.yellow(`    💡 ${error.suggestion}`));
          }
        }
        throw new Error(
          `Template validation failed with ${criticalErrors.length} critical errors`
        );
      }

      // Show warnings for non-critical issues
      if (process.env.AI_SPINE_VERBOSE && result.warnings.length > 0) {
        console.log(
          chalk.yellow(
            `⚠️  Template validation warnings (${result.warnings.length}):`
          )
        );
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`  • ${warning.message}`));
        }
        console.log();
      }
    } else if (process.env.AI_SPINE_VERBOSE) {
      console.log(chalk.green('✅ Template validation passed'));
    }
  } catch (validationError) {
    if (process.env.AI_SPINE_VERBOSE) {
      console.warn(
        chalk.yellow(
          `Warning: Template validation failed: ${(validationError as Error).message}`
        )
      );
      console.warn(chalk.gray('Continuing with tool creation...'));
    }
    // Don't fail tool creation on validation errors unless they're critical
  }
}

/**
 * Validates processed content for common issues and potential problems.
 *
 * This function performs post-processing validation to ensure the generated
 * content is syntactically correct and follows best practices.
 *
 * @param content - The processed file content
 * @param sourcePath - Original source file path for error reporting
 * @param context - Template context used for processing
 * @throws {Error} When critical content validation issues are found
 */
async function validateProcessedContent(
  content: string,
  sourcePath: string,
  context: TemplateContext
): Promise<void> {
  const fileName = path.basename(sourcePath);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unresolved mustache templates
  const unresolvedTemplates = content.match(/\{\{[^}]*\}\}/g);
  if (unresolvedTemplates) {
    errors.push(
      `Unresolved template variables found: ${unresolvedTemplates.join(', ')}`
    );
  }

  // Validate TypeScript files
  if (sourcePath.endsWith('.ts')) {
    await validateTypeScriptContent(content, sourcePath, errors, warnings);
  }

  // Validate JSON files
  if (sourcePath.endsWith('.json')) {
    await validateJsonContent(content, sourcePath, errors, warnings);
  }

  // Validate package.json specifically
  if (fileName === 'package.json') {
    await validatePackageJsonContent(
      content,
      sourcePath,
      context,
      errors,
      warnings
    );
  }

  // Report errors and warnings
  if (errors.length > 0) {
    console.error(chalk.red(`❌ Content validation errors in ${fileName}:`));
    for (const error of errors) {
      console.error(chalk.red(`  • ${error}`));
    }
    throw new Error(`Content validation failed for ${fileName}`);
  }

  if (warnings.length > 0 && process.env.AI_SPINE_VERBOSE) {
    console.warn(
      chalk.yellow(`⚠️  Content validation warnings in ${fileName}:`)
    );
    for (const warning of warnings) {
      console.warn(chalk.yellow(`  • ${warning}`));
    }
  }
}

/**
 * Validates TypeScript content for syntax issues.
 */
async function validateTypeScriptContent(
  content: string,
  _sourcePath: string,
  errors: string[],
  warnings: string[]
): Promise<void> {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for invalid JavaScript/TypeScript variable names
    const invalidVarPattern =
      /(?:const|let|var)\s+([^a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/;
    const match = line.match(invalidVarPattern);
    if (match) {
      errors.push(`Invalid variable name "${match[1]}" at line ${lineNumber}`);
    }

    // Check for potential issues with generated identifiers
    const generatedIdPattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/;
    const idMatch = line.match(generatedIdPattern);
    if (idMatch) {
      const varName = idMatch[1];

      // Check for JavaScript reserved words
      const reservedWords = [
        'break',
        'case',
        'catch',
        'class',
        'const',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'else',
        'export',
        'extends',
        'finally',
        'for',
        'function',
        'if',
        'import',
        'in',
        'instanceof',
        'let',
        'new',
        'return',
        'super',
        'switch',
        'this',
        'throw',
        'try',
        'typeof',
        'var',
        'void',
        'while',
        'with',
        'yield',
      ];

      if (reservedWords.includes(varName)) {
        errors.push(
          `Variable name "${varName}" is a reserved word at line ${lineNumber}`
        );
      }
    }

    // Check for potential syntax issues
    if (line.includes('function(') && !line.includes('function (')) {
      warnings.push(
        `Consider adding space after 'function' at line ${lineNumber}`
      );
    }
  }

  // Check for required imports
  if (
    content.includes('createTool') &&
    !content.includes("from '@ai-spine/tools'")
  ) {
    errors.push('Missing import for createTool from @ai-spine/tools');
  }

  // Check for proper async/await usage
  if (content.includes('async function') && !content.includes('await')) {
    warnings.push('Function marked as async but no await found');
  }
}

/**
 * Validates JSON content for syntax issues.
 */
async function validateJsonContent(
  content: string,
  sourcePath: string,
  errors: string[],
  _warnings: string[]
): Promise<void> {
  try {
    // Check if this is a JSONC file (like tsconfig.json) that allows comments
    const fileName = path.basename(sourcePath).toLowerCase();
    const isJsoncFile =
      fileName === 'tsconfig.json' ||
      fileName === 'jsconfig.json' ||
      fileName.endsWith('.jsonc');

    if (isJsoncFile) {
      // For JSONC files, strip comments before parsing
      const jsonContent = stripJsonComments(content);
      JSON.parse(jsonContent);
    } else {
      // Regular JSON files
      JSON.parse(content);
    }
  } catch (parseError) {
    errors.push(`Invalid JSON syntax: ${(parseError as Error).message}`);
  }
}

/**
 * Strips comments from JSON content to make it valid JSON.
 * Handles both single-line and multi-line comments.
 */
function stripJsonComments(jsonString: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let inComment = false;
  let commentType: 'single' | 'multi' | null = null;

  while (i < jsonString.length) {
    const char = jsonString[i];
    const nextChar = jsonString[i + 1];

    // Handle strings (don't strip comments inside strings)
    if (char === '"' && !inComment && (i === 0 || jsonString[i - 1] !== '\\')) {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    if (inString) {
      result += char;
      i++;
      continue;
    }

    // Handle end of comments
    if (inComment) {
      if (commentType === 'single' && char === '\n') {
        inComment = false;
        commentType = null;
        result += char; // Keep the newline
      } else if (commentType === 'multi' && char === '*' && nextChar === '/') {
        inComment = false;
        commentType = null;
        i += 2; // Skip both * and /
        continue;
      }
      i++;
      continue;
    }

    // Handle start of comments
    if (char === '/' && nextChar === '/') {
      inComment = true;
      commentType = 'single';
      i += 2;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inComment = true;
      commentType = 'multi';
      i += 2;
      continue;
    }

    // Regular character
    result += char;
    i++;
  }

  return result;
}

/**
 * Validates package.json content for required fields and structure.
 */
async function validatePackageJsonContent(
  content: string,
  _sourcePath: string,
  context: TemplateContext,
  errors: string[],
  warnings: string[]
): Promise<void> {
  try {
    const packageJson = JSON.parse(content);

    // Validate required fields
    const requiredFields = [
      'name',
      'version',
      'description',
      'main',
      'scripts',
    ];
    for (const field of requiredFields) {
      if (!packageJson[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate name matches context
    if (packageJson.name !== context.packageName) {
      errors.push(
        `Package name mismatch: expected "${context.packageName}", got "${packageJson.name}"`
      );
    }

    // Validate scripts
    const requiredScripts = ['dev', 'build', 'start'];
    if (packageJson.scripts) {
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          warnings.push(`Missing recommended script: ${script}`);
        }
      }
    }

    // Validate dependencies
    if (
      !packageJson.dependencies ||
      !packageJson.dependencies['@ai-spine/tools']
    ) {
      errors.push('Missing core dependency: @ai-spine/tools');
    }

    // Check for common dependency issues
    if (packageJson.dependencies) {
      for (const [dep, version] of Object.entries(packageJson.dependencies)) {
        if (typeof version !== 'string') {
          errors.push(
            `Invalid version for dependency ${dep}: must be a string`
          );
        } else if (!version.match(/^[\^~]?\d+\.\d+\.\d+/)) {
          warnings.push(
            `Unusual version format for dependency ${dep}: ${version}`
          );
        }
      }
    }
  } catch (parseError) {
    errors.push(
      `package.json is not valid JSON: ${(parseError as Error).message}`
    );
  }
}

/**
 * Enhanced template context generation with additional validation and utilities.
 *
 * This function creates a comprehensive context object that includes all the
 * variables needed for template processing, with additional metadata and
 * validation helpers.
 *
 * @param options - Tool creation options
 * @returns Enhanced template context with additional utilities
 */
export function generateEnhancedTemplateContext(
  options: CreateToolOptions
): TemplateContext & {
  // Additional context properties for enhanced templating
  hasApiKey: boolean;
  hasDatabase: boolean;
  hasFileProcessing: boolean;
  authorName: string;
  projectUrl: string;
  licenseUrl: string;
} {
  const baseContext = generateTemplateContext(options);

  return {
    ...baseContext,
    // Template feature detection (basic template has minimal features)
    hasApiKey: false,
    hasDatabase: false,
    hasFileProcessing: false,

    // Project metadata
    authorName: 'AI Spine Developer',
    projectUrl: `https://github.com/ai-spine/${options.name}`,
    licenseUrl: 'https://opensource.org/licenses/MIT',
  };
}
