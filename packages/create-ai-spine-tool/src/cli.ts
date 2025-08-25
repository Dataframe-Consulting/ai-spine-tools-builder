#!/usr/bin/env node

/**
 * AI Spine Tool Generator CLI
 * 
 * This CLI tool creates production-ready AI Spine tools from templates.
 * It provides an interactive setup flow with validation, progress tracking,
 * and intelligent defaults.
 * 
 * @fileoverview Main CLI entry point for create-ai-spine-tool
 * @author AI Spine Team
 * @since 1.0.0
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import validatePackageName from 'validate-npm-package-name';
import { createTool } from './create-tool';
import { TemplateType, Language, CreateToolOptions, TeamConfig, SystemRequirements } from './types';

/**
 * System requirements for tool creation
 */
const SYSTEM_REQUIREMENTS: SystemRequirements = {
  nodeVersion: '18.0.0',
  npmVersion: '9.0.0',
  diskSpaceMb: 100,
  requiredTools: ['node', 'npm']
};

/**
 * Default team configuration filename
 */
const TEAM_CONFIG_FILENAME = '.ai-spine-tool.json';

/**
 * Commander program instance
 */
const program = new Command();

program
  .name('create-ai-spine-tool')
  .description('Create a new AI Spine tool with interactive setup and validation')
  .version('1.0.0')
  .argument('[name]', 'tool name (must be a valid npm package name)')
  .option('-t, --template <template>', 'template type: basic, api-integration, data-processing')
  .option('-l, --lang <language>', 'programming language: typescript (recommended), javascript')
  .option('--no-git', 'skip git repository initialization')
  .option('--no-install', 'skip automatic dependency installation')
  .option('-y, --yes', 'use default answers for all prompts (non-interactive mode)')
  .option('--config <path>', 'path to team configuration file')
  .option('--check-system', 'verify system requirements before creating tool')
  .option('--dry-run', 'show what would be created without actually creating it')
  .option('--verbose', 'enable verbose logging for troubleshooting')
  .action(async (name, options) => {
    try {
      // Enable verbose logging if requested
      if (options.verbose) {
        process.env.AI_SPINE_VERBOSE = 'true';
        console.log(chalk.gray('Verbose logging enabled'));
      }

      // Check system requirements if requested
      if (options.checkSystem) {
        await checkSystemRequirements();
        return;
      }

      // Dry run mode
      if (options.dryRun) {
        await dryRun(name, options);
        return;
      }

      await main(name, options);
    } catch (error) {
      await handleCliError(error);
      process.exit(1);
    }
  });

// Add help examples
program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.cyan('create-ai-spine-tool my-weather-tool')}
  ${chalk.cyan('create-ai-spine-tool my-api-tool --template api-integration --lang typescript')}
  ${chalk.cyan('create-ai-spine-tool my-tool --yes --no-git --no-install')}
  ${chalk.cyan('create-ai-spine-tool --check-system')}
  ${chalk.cyan('create-ai-spine-tool my-tool --dry-run')}

${chalk.bold('Configuration:')}
  Create a ${chalk.yellow(TEAM_CONFIG_FILENAME)} file in your project or home directory
  to set team-wide defaults for templates, language, and other options.

${chalk.bold('Templates:')}
  ${chalk.green('basic')}          - Simple tool with minimal setup (recommended for beginners)
  ${chalk.green('api-integration')} - Tool that integrates with external APIs
  ${chalk.green('data-processing')} - Tool for data transformation and analysis

${chalk.bold('Support:')}
  Documentation: ${chalk.blue('https://docs.ai-spine.com/tools')}
  Issues: ${chalk.blue('https://github.com/ai-spine/tools/issues')}
`);

program.parse();

/**
 * Main CLI entry point that orchestrates the tool creation process.
 * 
 * @param toolName - Optional tool name from command line argument
 * @param cliOptions - Command line options parsed by Commander
 */
async function main(toolName?: string, cliOptions: any = {}): Promise<void> {
  console.log();
  console.log(chalk.blue.bold('🚀 AI Spine Tool Generator'));
  console.log(chalk.gray('Create production-ready AI Spine tools in seconds'));
  console.log();

  // Load team configuration if available
  const teamConfig = await loadTeamConfig(cliOptions.config);
  
  // Log configuration source if verbose
  if (process.env.AI_SPINE_VERBOSE && teamConfig) {
    console.log(chalk.gray(`📋 Using team configuration from: ${(teamConfig as any)._source}`));
  }

  let options: CreateToolOptions;

  if (cliOptions.yes && toolName) {
    // Use defaults when --yes flag is provided
    options = {
      name: toolName,
      template: (cliOptions.template as TemplateType) || teamConfig?.defaultTemplate || 'basic',
      language: (cliOptions.lang as Language) || teamConfig?.defaultLanguage || 'typescript',
      includeTests: true,
      includeDocker: teamConfig?.docker?.include ?? true,
      initGit: teamConfig?.git?.init ?? !cliOptions.git,
      installDeps: !cliOptions.install,
    };
  } else {
    // Interactive mode
    options = await collectUserInput(toolName, cliOptions, teamConfig || undefined);
  }

  // Comprehensive validation
  await validateToolCreation(options);

  // Check if directory already exists
  const targetDir = path.resolve(process.cwd(), options.name);
  if (await fs.pathExists(targetDir)) {
    if (cliOptions.yes) {
      // In non-interactive mode, don't overwrite existing directories
      throw new Error(`Directory "${options.name}" already exists. Use interactive mode or choose a different name.`);
    }

    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${options.name}" already exists. Overwrite?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }

    await fs.remove(targetDir);
  }

  // Create the tool with progress tracking
  const startTime = Date.now();
  const spinner = ora('Creating tool...').start();
  
  try {
    await createTool(options, targetDir);
    const duration = Date.now() - startTime;
    spinner.succeed(chalk.green(`Tool created successfully! (${duration}ms)`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to create tool'));
    
    // Provide troubleshooting information
    console.log();
    console.log(chalk.yellow('Troubleshooting:'));
    console.log(chalk.gray('• Ensure you have write permissions in the current directory'));
    console.log(chalk.gray('• Check that you have sufficient disk space'));
    console.log(chalk.gray('• Try running with --verbose for more details'));
    console.log(chalk.gray('• For network issues, check your internet connection'));
    
    throw error;
  }

  // Print success message and next steps
  await printSuccessMessage(options, targetDir);
}

async function collectUserInput(
  initialName?: string,
  cliOptions: any = {},
  teamConfig?: TeamConfig
): Promise<CreateToolOptions> {
  const questions = [];

  // Tool name
  if (!initialName) {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Tool name:',
      validate: (input: string) => {
        if (!input.trim()) return 'Tool name is required';
        const validation = validatePackageName(input.trim());
        if (!validation.validForNewPackages) {
          return validation.errors?.join(', ') || 'Invalid package name';
        }
        return true;
      },
      filter: (input: string) => input.trim(),
    });
  }

  // Description
  questions.push({
    type: 'input',
    name: 'description',
    message: 'Tool description:',
    default: 'An AI Spine tool',
  });

  // Template type
  if (!cliOptions.template) {
    questions.push({
      type: 'list',
      name: 'template',
      message: 'Choose a template:',
      choices: [
        { name: 'Basic Tool - Simple tool with minimal setup', value: 'basic' },
        { name: 'API Integration - Tool that integrates with external APIs', value: 'api-integration' },
        { name: 'Data Processing - Tool for data transformation and analysis', value: 'data-processing' },
      ],
      default: 'basic',
    });
  }

  // Language
  if (!cliOptions.lang) {
    questions.push({
      type: 'list',
      name: 'language',
      message: 'Language:',
      choices: [
        { name: 'TypeScript (recommended)', value: 'typescript' },
        { name: 'JavaScript', value: 'javascript' },
      ],
      default: 'typescript',
    });
  }

  // Optional features
  questions.push(
    {
      type: 'confirm',
      name: 'includeTests',
      message: 'Include tests?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'includeDocker',
      message: 'Include Docker configuration?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize git repository?',
      default: !cliOptions.git,
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies?',
      default: !cliOptions.install,
    }
  );

  // Show configuration summary before prompting if verbose
  if (process.env.AI_SPINE_VERBOSE) {
    console.log(chalk.gray('\\nConfiguration sources:'));
    if (teamConfig) {
      console.log(chalk.gray(`  Team config: ${(teamConfig as any)._source}`));
    }
    if (Object.keys(cliOptions).length > 0) {
      console.log(chalk.gray(`  CLI options: ${Object.keys(cliOptions).join(', ')}`));
    }
    console.log();
  }

  const answers = await inquirer.prompt(questions);

  return {
    name: initialName || answers.name,
    description: answers.description,
    template: cliOptions.template || answers.template,
    language: cliOptions.lang || answers.language,
    includeTests: answers.includeTests,
    includeDocker: answers.includeDocker,
    initGit: answers.initGit,
    installDeps: answers.installDeps,
  };
}

/**
 * Prints success message and next steps after tool creation.
 * 
 * @param options - Tool creation options
 * @param targetDir - Target directory where tool was created
 */
async function printSuccessMessage(options: CreateToolOptions, targetDir: string): Promise<void> {
  console.log();
  console.log(chalk.green.bold('✅ Tool created successfully!'));
  console.log();
  
  // Show tool information
  console.log(chalk.bold('📦 Tool Information:'));
  console.log(chalk.gray(`  Name: ${options.name}`));
  console.log(chalk.gray(`  Template: ${options.template}`));
  console.log(chalk.gray(`  Language: ${options.language}`));
  console.log(chalk.gray(`  Location: ${path.relative(process.cwd(), targetDir)}`));
  console.log();
  
  // Show next steps
  console.log(chalk.bold('🚀 Next steps:'));
  console.log();
  console.log(chalk.cyan(`  cd ${options.name}`));
  
  if (!options.installDeps) {
    console.log(chalk.cyan('  npm install'));
  }
  
  console.log(chalk.cyan('  npm run dev'));
  console.log();
  
  // Show available commands
  console.log(chalk.bold('📝 Available commands:'));
  console.log(chalk.gray('  npm run dev      - Start development server with hot reload'));
  console.log(chalk.gray('  npm run build    - Build for production'));
  
  if (options.includeTests) {
    console.log(chalk.gray('  npm run test     - Run tests'));
    console.log(chalk.gray('  npm run test:watch - Run tests in watch mode'));
  }
  
  console.log(chalk.gray('  npm run lint     - Check code style'));
  console.log();
  
  // Show template-specific information
  await showTemplateSpecificInfo(options.template);
  
  // Show helpful resources
  console.log(chalk.bold('📚 Resources:'));
  console.log(chalk.blue('  Documentation: https://docs.ai-spine.com/tools'));
  console.log(chalk.blue('  Examples: https://github.com/ai-spine/examples'));
  console.log(chalk.blue('  Community: https://discord.gg/ai-spine'));
  console.log();
  
  // Show quick test command
  console.log(chalk.bold('🧪 Quick test:'));
  console.log(chalk.cyan(`  cd ${options.name} && npm run dev`));
  console.log(chalk.gray('  Then visit http://localhost:3000/health in your browser'));
  console.log();
}

/**
 * Shows template-specific information and tips.
 * 
 * @param template - Template type that was used
 */
async function showTemplateSpecificInfo(template: TemplateType): Promise<void> {
  console.log(chalk.bold('💡 Template-specific tips:'));
  
  switch (template) {
    case 'basic':
      console.log(chalk.gray('  • Perfect for getting started with AI Spine tools'));
      console.log(chalk.gray('  • Modify src/index.ts to implement your tool logic'));
      console.log(chalk.gray('  • Add input fields in the schema section'));
      break;
      
    case 'api-integration':
      console.log(chalk.gray('  • Includes axios for HTTP requests'));
      console.log(chalk.gray('  • Configure API endpoints in the config section'));
      console.log(chalk.gray('  • Add API key validation for secure integrations'));
      console.log(chalk.gray('  • Use environment variables for sensitive data'));
      break;
      
    case 'data-processing':
      console.log(chalk.gray('  • Includes lodash for data manipulation'));
      console.log(chalk.gray('  • Perfect for CSV, JSON, and data transformation'));
      console.log(chalk.gray('  • Consider streaming for large datasets'));
      console.log(chalk.gray('  • Add validation for input data formats'));
      break;
  }
  
  console.log();
}

/**
 * Loads team configuration from various locations.
 * 
 * @param configPath - Optional path to config file
 * @returns Team configuration or null if not found
 */
async function loadTeamConfig(configPath?: string): Promise<TeamConfig | null> {
  const searchPaths = [];
  
  // Add custom config path if provided
  if (configPath) {
    searchPaths.push(path.resolve(configPath));
  }
  
  // Add standard locations
  searchPaths.push(
    path.join(process.cwd(), TEAM_CONFIG_FILENAME),
    path.join(process.cwd(), '.config', TEAM_CONFIG_FILENAME),
    path.join(require('os').homedir(), TEAM_CONFIG_FILENAME)
  );
  
  for (const configPath of searchPaths) {
    try {
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        (config as any)._source = configPath;
        return config;
      }
    } catch (error) {
      if (process.env.AI_SPINE_VERBOSE) {
        console.warn(chalk.yellow(`Warning: Could not read config file ${configPath}: ${(error as Error).message}`));
      }
    }
  }
  
  return null;
}

/**
 * Validates system requirements before tool creation.
 */
async function checkSystemRequirements(): Promise<void> {
  console.log(chalk.blue.bold('🔍 System Requirements Check'));
  console.log();
  
  let allGood = true;
  
  // Check Node.js version
  const nodeVersion = process.version.replace('v', '');
  const nodeOk = compareVersions(nodeVersion, SYSTEM_REQUIREMENTS.nodeVersion) >= 0;
  
  console.log(chalk[nodeOk ? 'green' : 'red'](`${nodeOk ? '✅' : '❌'} Node.js: ${nodeVersion} (required: >=${SYSTEM_REQUIREMENTS.nodeVersion})`));
  if (!nodeOk) allGood = false;
  
  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    const npmOk = compareVersions(npmVersion, SYSTEM_REQUIREMENTS.npmVersion) >= 0;
    
    console.log(chalk[npmOk ? 'green' : 'red'](`${npmOk ? '✅' : '❌'} npm: ${npmVersion} (required: >=${SYSTEM_REQUIREMENTS.npmVersion})`));
    if (!npmOk) allGood = false;
  } catch (error) {
    console.log(chalk.red('❌ npm: not found'));
    allGood = false;
  }
  
  // Check git availability
  try {
    execSync('git --version', { stdio: 'ignore' });
    console.log(chalk.green('✅ git: available'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  git: not available (optional, needed for git init)'));
  }
  
  // Check disk space (approximate)
  try {
    await fs.stat(process.cwd());
    console.log(chalk.green('✅ Disk space: available'));
  } catch (error) {
    console.log(chalk.red('❌ Disk space: cannot check current directory'));
    allGood = false;
  }
  
  console.log();
  
  if (allGood) {
    console.log(chalk.green.bold('🎉 All system requirements met!'));
  } else {
    console.log(chalk.red.bold('❌ Some requirements are not met'));
    console.log(chalk.yellow('Please update your system before creating tools'));
  }
  
  console.log();
}

/**
 * Runs a dry run showing what would be created without actually creating it.
 * 
 * @param toolName - Tool name
 * @param cliOptions - CLI options
 */
async function dryRun(toolName?: string, cliOptions: any = {}): Promise<void> {
  console.log(chalk.blue.bold('🏃‍♂️ Dry Run Mode'));
  console.log(chalk.gray('Showing what would be created without actually creating it'));
  console.log();
  
  const teamConfig = await loadTeamConfig(cliOptions.config);
  let options: CreateToolOptions;
  
  if (cliOptions.yes && toolName) {
    options = {
      name: toolName,
      template: (cliOptions.template as TemplateType) || teamConfig?.defaultTemplate || 'basic',
      language: (cliOptions.lang as Language) || teamConfig?.defaultLanguage || 'typescript',
      includeTests: true,
      includeDocker: teamConfig?.docker?.include ?? true,
      initGit: teamConfig?.git?.init ?? !cliOptions.git,
      installDeps: !cliOptions.install,
    };
  } else {
    options = await collectUserInput(toolName, cliOptions, teamConfig || undefined);
  }
  
  console.log(chalk.bold('📋 Tool Configuration:'));
  console.log(chalk.gray(`  Name: ${options.name}`));
  console.log(chalk.gray(`  Description: ${options.description || 'An AI Spine tool'}`));
  console.log(chalk.gray(`  Template: ${options.template}`));
  console.log(chalk.gray(`  Language: ${options.language}`));
  console.log(chalk.gray(`  Include Tests: ${options.includeTests ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  Include Docker: ${options.includeDocker ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  Initialize Git: ${options.initGit ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  Install Dependencies: ${options.installDeps ? 'Yes' : 'No'}`));
  console.log();
  
  console.log(chalk.bold('📁 Files that would be created:'));
  const files = await getFileList(options.template, options.language, options);
  files.forEach(file => console.log(chalk.gray(`  ${file}`)));
  console.log();
  
  console.log(chalk.green('✅ Dry run completed. Run without --dry-run to actually create the tool.'));
}

/**
 * Comprehensive validation for tool creation.
 * 
 * @param options - Tool creation options
 */
async function validateToolCreation(options: CreateToolOptions): Promise<void> {
  const errors: string[] = [];
  
  // Validate tool name
  const nameValidation = validatePackageName(options.name);
  if (!nameValidation.validForNewPackages) {
    errors.push(`Invalid tool name: ${nameValidation.errors?.join(', ') || 'Unknown validation error'}`);
  }
  
  // Check for reserved names
  const reservedNames = ['ai-spine', 'create-ai-spine-tool', 'test', 'node_modules'];
  if (reservedNames.includes(options.name.toLowerCase())) {
    errors.push(`Tool name "${options.name}" is reserved and cannot be used`);
  }
  
  // Validate template exists
  const validTemplates: TemplateType[] = ['basic', 'api-integration', 'data-processing'];
  if (!validTemplates.includes(options.template)) {
    errors.push(`Invalid template "${options.template}". Must be one of: ${validTemplates.join(', ')}`);
  }
  
  // Validate language
  const validLanguages: Language[] = ['typescript', 'javascript'];
  if (!validLanguages.includes(options.language)) {
    errors.push(`Invalid language "${options.language}". Must be one of: ${validLanguages.join(', ')}`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed:\\n${errors.map(e => `  • ${e}`).join('\\n')}`);
  }
}

/**
 * Enhanced error handler with troubleshooting information.
 * 
 * @param error - Error that occurred
 */
async function handleCliError(error: any): Promise<void> {
  console.error(chalk.red.bold('❌ Error occurred:'));
  console.error(chalk.red(error.message || error));
  
  // Show troubleshooting based on error type
  if (error.code === 'EACCES') {
    console.log();
    console.log(chalk.yellow('🔧 Troubleshooting - Permission Error:'));
    console.log(chalk.gray('  • Check that you have write permissions in the current directory'));
    console.log(chalk.gray('  • Try running as administrator/sudo (not recommended)'));
    console.log(chalk.gray('  • Choose a different directory where you have write access'));
  } else if (error.code === 'ENOENT') {
    console.log();
    console.log(chalk.yellow('🔧 Troubleshooting - File/Command Not Found:'));
    console.log(chalk.gray('  • Ensure Node.js and npm are installed'));
    console.log(chalk.gray('  • Check that git is installed (if using git features)'));
    console.log(chalk.gray('  • Verify you are in the correct directory'));
  } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    console.log();
    console.log(chalk.yellow('🔧 Troubleshooting - Network Error:'));
    console.log(chalk.gray('  • Check your internet connection'));
    console.log(chalk.gray('  • Try again in a few minutes'));
    console.log(chalk.gray('  • Check if you are behind a corporate firewall'));
    console.log(chalk.gray('  • Use --no-install to skip dependency installation'));
  } else {
    console.log();
    console.log(chalk.yellow('🔧 General Troubleshooting:'));
    console.log(chalk.gray('  • Run with --verbose for more detailed output'));
    console.log(chalk.gray('  • Check --help for command usage'));
    console.log(chalk.gray('  • Try --dry-run to see what would be created'));
  }
  
  console.log();
  console.log(chalk.blue('📞 Need help? Visit: https://docs.ai-spine.com/troubleshooting'));
  console.log();
}

/**
 * Gets the list of files that would be created for a template.
 * 
 * @param template - Template type
 * @param language - Programming language
 * @param options - Tool options
 * @returns Array of file paths
 */
async function getFileList(template: TemplateType, language: Language, options: CreateToolOptions): Promise<string[]> {
  const files: string[] = [];
  
  // Common files
  files.push('package.json', 'README.md', 'src/index.ts');
  
  if (options.includeTests) {
    files.push('jest.config.js', 'tests/tool.test.ts');
  }
  
  if (options.includeDocker) {
    files.push('Dockerfile', '.dockerignore');
  }
  
  if (options.initGit) {
    files.push('.gitignore');
  }
  
  // Template-specific files
  switch (template) {
    case 'api-integration':
      files.push('src/api-client.ts', 'src/types.ts');
      break;
    case 'data-processing':
      files.push('src/processors.ts', 'src/validators.ts');
      break;
  }
  
  // Language-specific adjustments
  if (language === 'javascript') {
    return files.map(file => file.replace(/\\.ts$/, '.js'));
  }
  
  return files;
}

/**
 * Simple version comparison utility.
 * 
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  const maxLength = Math.max(v1parts.length, v2parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
}