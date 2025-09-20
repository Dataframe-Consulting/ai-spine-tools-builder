#!/usr/bin/env node

/**
 * Build verification script for AI Spine Tools Core
 * Ensures all required build outputs exist
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const requiredFiles = ['index.js', 'index.esm.js', 'index.d.ts'];

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
  process.exit(1);
}

console.log('✅ All build files verified successfully!');
