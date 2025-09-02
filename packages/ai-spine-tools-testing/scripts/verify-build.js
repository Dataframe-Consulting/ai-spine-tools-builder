#!/usr/bin/env node

/**
 * Build verification script for AI Spine Tools Testing
 * Ensures all required build outputs exist, especially CLI tools
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const requiredFiles = [
  'index.js',
  'index.esm.js', 
  'template-validator.js',
  'example-validator.js'
];

console.log('🔍 Verifying build output...');

let missingFiles = [];
for (const file of requiredFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  } else {
    console.log(`✅ ${file} exists`);
  }
}

if (missingFiles.length > 0) {
  console.error('❌ Missing build files:', missingFiles.join(', '));
  
  // Try to rebuild CLI files specifically if they're missing
  if (missingFiles.some(file => file.includes('validator'))) {
    console.log('🔧 Attempting to rebuild CLI files...');
    try {
      // Build CLI files directly using rollup CLI
      const cliFiles = [
        { input: 'src/template-validator-cli.ts', output: 'dist/template-validator.js' },
        { input: 'src/example-validator-cli.ts', output: 'dist/example-validator.js' }
      ];
      
      for (const { input, output } of cliFiles) {
        if (!fs.existsSync(path.join(__dirname, '..', output))) {
          console.log(`Building ${input} -> ${output}`);
          execSync(`npx rollup ${input} --file ${output} --format cjs --banner "#!/usr/bin/env node" --plugin @rollup/plugin-typescript --plugin @rollup/plugin-node-resolve --plugin @rollup/plugin-commonjs`, {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to rebuild CLI files:', error.message);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}

console.log('✅ All build files verified successfully!');