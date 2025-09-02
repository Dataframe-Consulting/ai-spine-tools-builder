/**
 * CLI script for example validation
 * This script validates all examples in the AI Spine Tools SDK
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { execSync } from 'child_process';

interface ExampleValidationResult {
  name: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateExample(
  examplePath: string
): Promise<ExampleValidationResult> {
  const exampleName = path.basename(examplePath);
  const result: ExampleValidationResult = {
    name: exampleName,
    isValid: true,
    errors: [],
    warnings: [],
  };

  try {
    // Check if package.json exists
    const packageJsonPath = path.join(examplePath, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      result.errors.push('Missing package.json');
      result.isValid = false;
      return result;
    }

    // Validate package.json structure
    try {
      const packageJson = await fs.readJson(packageJsonPath);

      if (!packageJson.name) {
        result.errors.push('package.json missing name field');
        result.isValid = false;
      }

      if (!packageJson.main && !packageJson.exports) {
        result.errors.push('package.json missing main or exports field');
        result.isValid = false;
      }

      if (!packageJson.scripts || !packageJson.scripts.build) {
        result.warnings.push('package.json missing build script');
      }

      if (
        !packageJson.dependencies ||
        !packageJson.dependencies['@ai-spine/tools']
      ) {
        result.errors.push('Missing core dependency: @ai-spine/tools');
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(`Invalid package.json: ${(error as Error).message}`);
      result.isValid = false;
      return result;
    }

    // Check if main source file exists
    const srcPath = path.join(examplePath, 'src');
    if (!(await fs.pathExists(srcPath))) {
      result.errors.push('Missing src directory');
      result.isValid = false;
      return result;
    }

    const indexFile = (await fs.pathExists(path.join(srcPath, 'index.ts')))
      ? 'index.ts'
      : 'index.js';
    const mainFilePath = path.join(srcPath, indexFile);

    if (!(await fs.pathExists(mainFilePath))) {
      result.errors.push('Missing main source file (index.ts or index.js)');
      result.isValid = false;
      return result;
    }

    // Validate main file content
    const mainContent = await fs.readFile(mainFilePath, 'utf-8');

    if (!mainContent.includes('createTool')) {
      result.errors.push('Main file does not use createTool function');
      result.isValid = false;
    }

    if (!mainContent.includes('export')) {
      result.warnings.push('Main file missing export statement');
    }

    // Try to build the example (if TypeScript)
    if (indexFile.endsWith('.ts')) {
      try {
        // Check if TypeScript config exists
        const tsConfigPath = path.join(examplePath, 'tsconfig.json');
        if (await fs.pathExists(tsConfigPath)) {
          execSync('npx tsc --noEmit', {
            cwd: examplePath,
            stdio: 'pipe',
            timeout: 15000,
          });
        }
      } catch (error) {
        const message =
          (error as any).stdout?.toString() || (error as Error).message;
        result.errors.push(`TypeScript compilation failed: ${message}`);
        result.isValid = false;
      }
    }
  } catch (error) {
    result.errors.push(`Validation error: ${(error as Error).message}`);
    result.isValid = false;
  }

  return result;
}

async function main() {
  console.log(chalk.blue.bold('🔍 AI Spine Tools Example Validator'));
  console.log(chalk.gray('Validating all examples in the SDK...\n'));

  const examplesDir = path.resolve(__dirname, '../../../examples');

  if (!(await fs.pathExists(examplesDir))) {
    console.log(
      chalk.yellow('⚠️  Examples directory not found - skipping validation')
    );
    console.log(
      chalk.gray('This is expected if no examples have been created yet.')
    );
    process.exit(0);
  }

  const examples = await fs.readdir(examplesDir, { withFileTypes: true });
  const exampleDirs = examples
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(examplesDir, entry.name));

  if (exampleDirs.length === 0) {
    console.log(chalk.yellow('⚠️  No examples found to validate'));
    process.exit(0);
  }

  let totalExamples = 0;
  let passedExamples = 0;
  let failedExamples = 0;

  for (const examplePath of exampleDirs) {
    totalExamples++;
    console.log(chalk.cyan(`Validating ${path.basename(examplePath)}...`));

    const result = await validateExample(examplePath);

    if (result.isValid) {
      console.log(chalk.green(`✅ ${result.name} - PASSED`));
      passedExamples++;
    } else {
      console.log(chalk.red(`❌ ${result.name} - FAILED`));
      failedExamples++;

      // Print errors
      if (result.errors.length > 0) {
        console.log(chalk.red('  Errors:'));
        result.errors.forEach(error => {
          console.log(chalk.red(`    • ${error}`));
        });
      }
    }

    // Print warnings
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('  Warnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`    • ${warning}`));
      });
    }

    console.log(); // Add spacing between examples
  }

  // Print summary
  console.log(chalk.bold('\n📊 Example Validation Summary:'));
  console.log(chalk.gray(`Total examples tested: ${totalExamples}`));
  console.log(chalk.green(`Passed: ${passedExamples}`));
  console.log(chalk.red(`Failed: ${failedExamples}`));

  if (failedExamples > 0) {
    console.log(chalk.red.bold('\n❌ Some example validations failed!'));
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✅ All example validations passed!'));
    process.exit(0);
  }
}

// Run the CLI
main().catch(error => {
  console.error(chalk.red.bold('Fatal error:'), error.message);
  process.exit(1);
});
