#!/usr/bin/env node

/**
 * Ensure CLI files script for AI Spine Tools Testing
 * This script MUST ensure CLI files exist before tests run
 * It's a last-resort failsafe for CI environments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const cliFiles = ['template-validator.js', 'example-validator.js'];

console.log('🔍 Ensuring CLI files exist...');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  console.log('📁 Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
}

let needsRebuild = false;
for (const file of cliFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Missing: ${file}`);
    needsRebuild = true;
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

if (needsRebuild) {
  console.log('🔧 Building missing CLI files...');

  try {
    // Try the main build first
    console.log('Attempting full build...');
    execSync('npm run build', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });

    // Verify files exist after build
    let stillMissing = [];
    for (const file of cliFiles) {
      const filePath = path.join(distDir, file);
      if (!fs.existsSync(filePath)) {
        stillMissing.push(file);
      }
    }

    if (stillMissing.length > 0) {
      throw new Error(`Still missing after build: ${stillMissing.join(', ')}`);
    }
  } catch (buildError) {
    console.warn('⚠️ Main build failed, trying direct CLI build...');

    // Fallback: build CLI files directly
    const rollupConfigs = [
      {
        input: 'src/template-validator-cli.ts',
        output: 'dist/template-validator.js',
      },
      {
        input: 'src/example-validator-cli.ts',
        output: 'dist/example-validator.js',
      },
    ];

    for (const { input, output } of rollupConfigs) {
      if (!fs.existsSync(path.join(__dirname, '..', output))) {
        console.log(`📦 Building ${input} -> ${output}`);
        try {
          execSync(
            `npx rollup ${input} --file ${output} --format cjs --banner "#!/usr/bin/env node" --plugin @rollup/plugin-node-resolve --plugin @rollup/plugin-commonjs --plugin @rollup/plugin-typescript`,
            {
              cwd: path.join(__dirname, '..'),
              stdio: 'inherit',
            }
          );
        } catch (rollupError) {
          // If rollup fails, create a basic wrapper as absolute last resort
          console.warn(
            `⚠️ Rollup failed for ${input}, creating basic wrapper...`
          );
          const basicContent = `#!/usr/bin/env node
console.error('❌ CLI tool not properly built. Please run: npm run build');
process.exit(1);
`;
          fs.writeFileSync(path.join(__dirname, '..', output), basicContent, {
            mode: 0o755,
          });
        }
      }
    }
  }
}

// Final verification
let finalMissing = [];
for (const file of cliFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    finalMissing.push(file);
  }
}

if (finalMissing.length > 0) {
  console.error(
    `❌ CRITICAL: Still missing CLI files: ${finalMissing.join(', ')}`
  );
  console.error('This indicates a serious build system issue.');
  process.exit(1);
}

console.log('✅ All CLI files are ready!');
