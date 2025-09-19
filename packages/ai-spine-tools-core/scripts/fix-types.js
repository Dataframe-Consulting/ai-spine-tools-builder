/**
 * Post-build script to ensure FileInput type is properly exported
 * This addresses a limitation with rollup-plugin-dts not including standalone type exports
 */

const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '..', 'dist', 'index.d.ts');

// Read the generated .d.ts file
let content = fs.readFileSync(typesPath, 'utf8');

// Check if FileInput is already in the export type list (search in export line specifically)
const exportMatch = content.match(/export type \{ ([^}]+) \};$/);
const hasFileInputExport = exportMatch && exportMatch[1].includes('FileInput');

if (!hasFileInputExport) {
  console.log('⚠️  FileInput not found in type exports, adding it...');

  // Define FileInput interface (extracted from types.ts)
  const fileInputInterface = `/**
 * Type helper for file inputs received from the AI Spine API.
 * Files are automatically processed and encoded in base64 with metadata.
 *
 * @example
 * \`\`\`typescript
 * interface MyToolInput {
 *   document: FileInput;
 *   attachments: FileInput[];
 * }
 *
 * // In your execute function:
 * const document = input.document;
 * const fileBuffer = Buffer.from(document.content, 'base64');
 * \`\`\`
 */
interface FileInput {
  /** Original filename */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  type: string;
  /** Last modified timestamp (optional) */
  lastModified?: number;
  /** File content encoded in base64 */
  content: string;
  /** Encoding type (always 'base64') */
  encoding: string;
}`;

  // Add the interface only if it's not already present
  if (!content.includes('interface FileInput')) {
    console.log('   Adding FileInput interface...');
    // Find where to insert the interface (before the first interface or at the beginning)
    const insertPosition = content.indexOf('interface ');
    if (insertPosition !== -1) {
      content = content.slice(0, insertPosition) + fileInputInterface + '\n' + content.slice(insertPosition);
    } else {
      // If no interfaces found, add after imports
      const importEndIndex = content.lastIndexOf("import ");
      if (importEndIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', importEndIndex);
        content = content.slice(0, nextLineIndex + 1) + '\n' + fileInputInterface + '\n' + content.slice(nextLineIndex + 1);
      } else {
        // Fallback: add at the beginning
        content = fileInputInterface + '\n' + content;
      }
    }
  } else {
    console.log('   FileInput interface already exists, skipping...');
  }

  // Add FileInput to the export type list (handle multiline exports)
  console.log('   Adding FileInput to exports...');
  const exportTypeRegex = /export type \{ ([^}]+) \};/s;
  content = content.replace(
    exportTypeRegex,
    (match, types) => {
      // Clean up the types string by removing newlines and extra spaces
      const cleanTypes = types.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const typeList = cleanTypes.split(', ').map(t => t.trim()).filter(t => t.length > 0);

      if (!typeList.includes('FileInput')) {
        typeList.push('FileInput');
        typeList.sort();
        console.log(`   Updated exports: ${typeList.length} types including FileInput`);
      } else {
        console.log('   FileInput already in exports');
      }
      return `export type { ${typeList.join(', ')} };`;
    }
  );

  // Write the updated content back
  fs.writeFileSync(typesPath, content, 'utf8');
  console.log('✅ FileInput interface and export added successfully');
} else {
  console.log('✅ FileInput already present in exports');
}