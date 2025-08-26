/**
 * CLI script for template validation
 * This script validates all templates in the AI Spine Tools SDK
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

// For now, implement a simple template validator here since we can't import from create-ai-spine-tool
type TemplateType = 'basic' | 'api-integration' | 'data-processing';
type Language = 'typescript' | 'javascript';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  templateType: TemplateType;
  language: Language;
}

async function validateTemplate(
  templateType: TemplateType,
  language: Language,
  templatesDir: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    templateType,
    language,
  };

  const templateDir = path.join(templatesDir, templateType, language);
  
  // Check if template directory exists
  if (!(await fs.pathExists(templateDir))) {
    result.errors.push(`Template directory not found: ${templateDir}`);
    result.isValid = false;
    return result;
  }

  // Check for required files
  const requiredFiles = [
    'package.json',
    language === 'typescript' ? 'src/index.ts' : 'src/index.js'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(templateDir, file);
    if (!(await fs.pathExists(filePath))) {
      result.errors.push(`Required file missing: ${file}`);
      result.isValid = false;
    }
  }

  // Validate package.json template if it exists
  const packageJsonPath = path.join(templateDir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      
      // Check if it's a template file (contains mustache syntax)
      if (content.includes('{{') && content.includes('}}')) {
        // This is a template file - validate template structure instead of JSON
        if (!content.includes('{{packageName}}') && !content.includes('{{toolName}}')) {
          result.warnings.push('package.json template missing tool name variables');
        }
        
        if (!content.includes('"dependencies"')) {
          result.warnings.push('package.json template missing dependencies section');
        }
        
        if (!content.includes('"scripts"')) {
          result.errors.push('package.json template missing scripts section');
          result.isValid = false;
        }
        
        // Check for required scripts in template
        const requiredScripts = ['dev', 'build', 'start'];
        for (const script of requiredScripts) {
          if (!content.includes(`"${script}"`)) {
            result.warnings.push(`package.json template missing ${script} script`);
          }
        }
      } else {
        // Try to parse as regular JSON
        try {
          const packageJson = JSON.parse(content);
          
          if (!packageJson.name) {
            result.errors.push('package.json missing name field');
            result.isValid = false;
          }
          
          if (!packageJson.scripts || !packageJson.scripts.dev) {
            result.warnings.push('package.json missing dev script');
          }
        } catch (parseError) {
          result.errors.push(`Invalid package.json: ${(parseError as Error).message}`);
          result.isValid = false;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to read package.json: ${(error as Error).message}`);
      result.isValid = false;
    }
  }

  // Validate main source file if it exists
  const mainFile = language === 'typescript' ? 'src/index.ts' : 'src/index.js';
  const mainFilePath = path.join(templateDir, mainFile);
  if (await fs.pathExists(mainFilePath)) {
    try {
      const content = await fs.readFile(mainFilePath, 'utf-8');
      
      // Check for mustache template variables
      if (content.includes('{{') && content.includes('}}')) {
        // This is good - it's a template file
      } else {
        result.warnings.push('Main file does not appear to use template variables');
      }
      
      if (!content.includes('createTool')) {
        result.warnings.push('Main file does not reference createTool function');
      }
    } catch (error) {
      result.errors.push(`Failed to read main file: ${(error as Error).message}`);
      result.isValid = false;
    }
  }

  return result;
}

async function main() {
  console.log(chalk.blue.bold('🔍 AI Spine Tools Template Validator'));
  console.log(chalk.gray('Validating all templates in the SDK...\n'));

  const templatesDir = path.resolve(__dirname, '../../../packages/create-ai-spine-tool/templates');
  const templateTypes: TemplateType[] = ['basic', 'api-integration', 'data-processing'];
  const languages: Language[] = ['typescript', 'javascript'];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const templateType of templateTypes) {
    for (const language of languages) {
      totalTests++;
      console.log(chalk.cyan(`Validating ${templateType}/${language}...`));

      try {
        const result = await validateTemplate(templateType, language, templatesDir);

        if (result.isValid) {
          console.log(chalk.green(`✅ ${templateType}/${language} - PASSED`));
          passedTests++;
        } else {
          console.log(chalk.red(`❌ ${templateType}/${language} - FAILED`));
          failedTests++;
          
          // Print detailed errors for failed tests
          if (result.errors.length > 0) {
            console.log(chalk.red('  Errors:'));
            result.errors.forEach(error => {
              console.log(chalk.red(`    • ${error}`));
            });
          }
          
          if (result.warnings.length > 0) {
            console.log(chalk.yellow('  Warnings:'));
            result.warnings.forEach(warning => {
              console.log(chalk.yellow(`    • ${warning}`));
            });
          }
        }
      } catch (error) {
        console.log(chalk.red(`❌ ${templateType}/${language} - ERROR: ${(error as Error).message}`));
        failedTests++;
      }

      console.log(); // Add spacing between tests
    }
  }

  // Print summary
  console.log(chalk.bold('\n📊 Validation Summary:'));
  console.log(chalk.gray(`Total templates tested: ${totalTests}`));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));

  if (failedTests > 0) {
    console.log(chalk.red.bold('\n❌ Some template validations failed!'));
    process.exit(1);
  } else {
    console.log(chalk.green.bold('\n✅ All template validations passed!'));
    process.exit(0);
  }
}

// Run the CLI
main().catch((error) => {
  console.error(chalk.red.bold('Fatal error:'), error.message);
  process.exit(1);
});