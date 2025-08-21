#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import validatePackageName from 'validate-npm-package-name';
import { createTool } from './create-tool';
import { TemplateType, Language, CreateToolOptions } from './types';

const program = new Command();

program
  .name('create-ai-spine-tool')
  .description('Create a new AI Spine tool')
  .version('1.0.0')
  .argument('[name]', 'tool name')
  .option('-t, --template <template>', 'template type (basic, api-integration, data-processing)')
  .option('-l, --lang <language>', 'language (typescript, javascript)')
  .option('--no-git', 'skip git initialization')
  .option('--no-install', 'skip dependency installation')
  .option('-y, --yes', 'use default answers')
  .action(async (name, options) => {
    try {
      await main(name, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

async function main(toolName?: string, cliOptions: any = {}): Promise<void> {
  console.log();
  console.log(chalk.blue.bold('🚀 AI Spine Tool Generator'));
  console.log(chalk.gray('Create production-ready AI Spine tools in seconds'));
  console.log();

  let options: CreateToolOptions;

  if (cliOptions.yes && toolName) {
    // Use defaults when --yes flag is provided
    options = {
      name: toolName,
      template: (cliOptions.template as TemplateType) || 'basic',
      language: (cliOptions.lang as Language) || 'typescript',
      includeTests: true,
      includeDocker: true,
      initGit: !cliOptions.git,
      installDeps: !cliOptions.install,
    };
  } else {
    // Interactive mode
    options = await collectUserInput(toolName, cliOptions);
  }

  // Validate tool name
  const nameValidation = validatePackageName(options.name);
  if (!nameValidation.validForNewPackages) {
    throw new Error(`Invalid tool name: ${nameValidation.errors?.join(', ') || 'Unknown validation error'}`);
  }

  // Check if directory already exists
  const targetDir = path.resolve(process.cwd(), options.name);
  if (await fs.pathExists(targetDir)) {
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

  // Create the tool
  const spinner = ora('Creating tool...').start();
  
  try {
    await createTool(options, targetDir);
    spinner.succeed(chalk.green('Tool created successfully!'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to create tool'));
    throw error;
  }

  // Print success message and next steps
  printSuccessMessage(options);
}

async function collectUserInput(
  initialName?: string,
  cliOptions: any = {}
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

function printSuccessMessage(options: CreateToolOptions): void {
  console.log();
  console.log(chalk.green.bold('✅ Tool created successfully!'));
  console.log();
  console.log(chalk.bold('Next steps:'));
  console.log();
  console.log(chalk.cyan(`  cd ${options.name}`));
  
  if (!options.installDeps) {
    console.log(chalk.cyan('  npm install'));
  }
  
  console.log(chalk.cyan('  npm run dev'));
  console.log();
  console.log(chalk.bold('Available commands:'));
  console.log(chalk.gray('  npm run dev      - Start development server'));
  console.log(chalk.gray('  npm run build    - Build for production'));
  console.log(chalk.gray('  npm run test     - Run tests'));
  console.log(chalk.gray('  npm run deploy   - Deploy to AI Spine platform'));
  console.log();
  console.log(chalk.bold('Documentation:'));
  console.log(chalk.blue('  https://docs.ai-spine.com/tools'));
  console.log();
}