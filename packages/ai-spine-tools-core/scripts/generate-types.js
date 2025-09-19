/**
 * Custom type generation script for @ai-spine/tools-core
 * This script adds missing type exports that TypeScript can't automatically generate
 */

const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '..', 'dist', 'index.d.ts');

// Read the existing declaration file
let content = fs.readFileSync(typesPath, 'utf8');

// Add FileInput to the type exports if it's not already there
if (!content.includes('FileInput')) {
  // Find the line with type exports and add FileInput
  content = content.replace(/export type \{ ([^}]+) \};/, (match, types) => {
    const typeList = types.split(', ').map(t => t.trim());
    if (!typeList.includes('FileInput')) {
      typeList.push('FileInput');
      typeList.sort();
    }
    return `export type { ${typeList.join(', ')} };`;
  });
}

// Write the updated content back
fs.writeFileSync(typesPath, content, 'utf8');

console.log('✅ Type declarations updated with FileInput export');
