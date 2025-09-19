/**
 * CI verification script to ensure FileInput is properly exported
 * This prevents publishing packages with broken FileInput types
 */

const fs = require('fs');
const path = require('path');

function verifyFileInput(packagePath) {
  const packageName = path.basename(packagePath);
  const dtsPath = path.join(packagePath, 'dist', 'index.d.ts');

  if (!fs.existsSync(dtsPath)) {
    console.log(
      `⚠️  ${packageName}: No .d.ts file found, skipping FileInput check`
    );
    return true;
  }

  const content = fs.readFileSync(dtsPath, 'utf8');

  // Check if FileInput interface exists
  const hasInterface = content.includes('interface FileInput');

  // Check if FileInput is exported
  const hasExport =
    content.includes('FileInput') &&
    content.match(/export type \{[^}]*FileInput[^}]*\}/);

  if (packageName === '@ai-spine/tools-core') {
    if (!hasInterface) {
      console.error(`❌ ${packageName}: FileInput interface missing`);
      return false;
    }
    if (!hasExport) {
      console.error(`❌ ${packageName}: FileInput not exported`);
      return false;
    }
    console.log(`✅ ${packageName}: FileInput properly defined and exported`);
  } else if (hasExport) {
    console.log(`✅ ${packageName}: FileInput re-exported correctly`);
  } else {
    console.log(
      `ℹ️  ${packageName}: FileInput not exported (expected for this package)`
    );
  }

  return true;
}

// Verify all packages
const packagesDir = path.join(__dirname, '..', 'packages');
const packages = fs
  .readdirSync(packagesDir)
  .map(dir => path.join(packagesDir, dir))
  .filter(
    dir =>
      fs.statSync(dir).isDirectory() &&
      fs.existsSync(path.join(dir, 'package.json'))
  );

let allPassed = true;

console.log('🔍 Verifying FileInput exports across packages...\n');

for (const pkg of packages) {
  if (!verifyFileInput(pkg)) {
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n✅ All FileInput verifications passed');
  process.exit(0);
} else {
  console.log('\n❌ FileInput verification failed');
  process.exit(1);
}
