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
import { CreateToolOptions, TemplateContext, TemplateType, Language } from './types';

/**
 * Creates a new AI Spine tool from the specified options and template.
 * 
 * This is the main entry point for tool creation. It orchestrates the entire
 * process including directory creation, template processing, git initialization,
 * and dependency installation.
 * 
 * @param options - Complete tool creation configuration
 * @param targetDir - Absolute path to the target directory where the tool will be created
 * @throws {Error} When tool creation fails due to file system, network, or validation errors
 * 
 * @example
 * ```typescript
 * await createTool({
 *   name: 'my-weather-tool',
 *   template: 'api-integration',
 *   language: 'typescript',
 *   includeTests: true,
 *   includeDocker: true,
 *   initGit: true,
 *   installDeps: true
 * }, '/path/to/my-weather-tool');
 * ```
 */
export async function createTool(options: CreateToolOptions, targetDir: string): Promise<void> {
  if (process.env.AI_SPINE_VERBOSE) {
    console.log(chalk.gray(`Creating tool "${options.name}" at ${targetDir}`));
  }
  
  // Create target directory
  await fs.ensureDir(targetDir);

  // Generate template context with all variable substitutions
  const context = generateTemplateContext(options);

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

  // Base dependencies
  const dependencies: Record<string, string> = {
    '@ai-spine/tools': '^1.0.0',
  };

  const devDependencies: Record<string, string> = {
    'typescript': '^5.0.0',
    '@types/node': '^20.0.0',
    'tsx': '^4.0.0',
    'nodemon': '^3.0.0',
  };

  // Add template-specific dependencies
  if (options.template === 'api-integration') {
    dependencies['axios'] = '^1.6.0';
    devDependencies['@types/axios'] = '^0.14.0';
  }

  if (options.template === 'data-processing') {
    dependencies['lodash'] = '^4.17.21';
    devDependencies['@types/lodash'] = '^4.14.0';
  }

  // Add test dependencies if tests are included
  if (options.includeTests) {
    devDependencies['jest'] = '^29.0.0';
    devDependencies['@types/jest'] = '^29.0.0';
    devDependencies['ts-jest'] = '^29.0.0';
  }

  return {
    toolName: options.name,
    toolNamePascalCase,
    toolNameKebabCase,
    description: options.description || 'An AI Spine tool',
    language: options.language,
    includeTests: options.includeTests,
    includeDocker: options.includeDocker,
    packageName: options.name,
    year: new Date().getFullYear(),
    dependencies,
    devDependencies,
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
    throw new Error(`Template not found: ${template}/${language}. Available templates: basic, api-integration, data-processing`);
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
 * This function handles the recursive directory traversal and file processing.
 * For each file, it reads the content, applies mustache template processing
 * with the provided context, and writes the result to the target location.
 * 
 * @param sourceDir - Source directory to copy from
 * @param targetDir - Target directory to copy to
 * @param context - Template context for mustache variable substitution
 */
async function copyAndProcessFiles(
  sourceDir: string,
  targetDir: string,
  context: TemplateContext
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
        const processedContent = mustache.render(content, context);
        await fs.writeFile(targetPath, processedContent);
        
        if (process.env.AI_SPINE_VERBOSE) {
          console.log(chalk.gray(`  Processed: ${path.relative(targetDir, targetPath)}`));
        }
      } catch (error) {
        throw new Error(`Failed to process file ${sourcePath}: ${(error as Error).message}`);
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
      execSync('git config user.name "AI Spine Tool Creator"', { cwd: targetDir, stdio: 'ignore' });
      execSync('git config user.email "noreply@ai-spine.com"', { cwd: targetDir, stdio: 'ignore' });
    }
    
    // Add all files and create initial commit
    execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit: Created with create-ai-spine-tool"', { cwd: targetDir, stdio: 'ignore' });
    
    spinner.succeed('Git repository initialized with initial commit');
  } catch (error) {
    spinner.warn('Failed to initialize git repository');
    
    if (process.env.AI_SPINE_VERBOSE) {
      console.log(chalk.yellow(`Git initialization error: ${(error as Error).message}`));
      console.log(chalk.gray('This is not critical and you can initialize git manually later'));
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
    console.log(chalk.yellow('⚠️  Dependency installation failed. You can install them manually:'));
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
    .replace(/^(.)/, (char) => char.toUpperCase());
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