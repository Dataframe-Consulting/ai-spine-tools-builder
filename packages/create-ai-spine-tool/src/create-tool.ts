import fs from 'fs-extra';
import path from 'path';
import mustache from 'mustache';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { CreateToolOptions, TemplateContext, TemplateType, Language } from './types';

export async function createTool(options: CreateToolOptions, targetDir: string): Promise<void> {
  // Create target directory
  await fs.ensureDir(targetDir);

  // Generate template context
  const context = generateTemplateContext(options);

  // Copy and process template files
  await copyTemplate(options.template, options.language, targetDir, context);

  // Initialize git repository
  if (options.initGit) {
    await initGitRepository(targetDir);
  }

  // Install dependencies
  if (options.installDeps) {
    await installDependencies(targetDir);
  }
}

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

async function copyTemplate(
  template: TemplateType,
  language: Language,
  targetDir: string,
  context: TemplateContext
): Promise<void> {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const templateDir = path.join(templatesDir, template, language);

  if (!(await fs.pathExists(templateDir))) {
    throw new Error(`Template not found: ${template}/${language}`);
  }

  await copyAndProcessFiles(templateDir, targetDir, context);

  // Copy common files
  const commonDir = path.join(templatesDir, 'common');
  if (await fs.pathExists(commonDir)) {
    await copyAndProcessFiles(commonDir, targetDir, context);
  }
}

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
      await fs.ensureDir(targetPath);
      await copyAndProcessFiles(sourcePath, targetPath, context);
    } else {
      const content = await fs.readFile(sourcePath, 'utf-8');
      const processedContent = mustache.render(content, context);
      await fs.writeFile(targetPath, processedContent);
    }
  }
}

async function initGitRepository(targetDir: string): Promise<void> {
  const spinner = ora('Initializing git repository...').start();
  
  try {
    execSync('git init', { cwd: targetDir, stdio: 'ignore' });
    execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: targetDir, stdio: 'ignore' });
    spinner.succeed('Git repository initialized');
  } catch (error) {
    spinner.warn('Failed to initialize git repository');
  }
}

async function installDependencies(targetDir: string): Promise<void> {
  const spinner = ora('Installing dependencies...').start();
  
  try {
    execSync('npm install', { cwd: targetDir, stdio: 'ignore' });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    console.log(chalk.yellow('You can install them manually by running:'));
    console.log(chalk.cyan('  npm install'));
  }
}

// Utility functions
function toPascalCase(str: string): string {
  return str
    .replace(/[\s\-_]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toUpperCase());
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}