#!/usr/bin/env node

/**
 * Documentation validation script for AI Spine Tools SDK
 * 
 * This script validates the completeness and quality of the documentation system
 * by checking file structure, content quality, and link integrity.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class DocumentationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.docsPath = path.join(__dirname, '..', 'docs');
    this.requiredSections = [
      'getting-started',
      'api-reference', 
      'advanced',
      'integration',
      'examples',
      'community'
    ];
    this.requiredFiles = [
      'docs/README.md',
      'docs/getting-started/quick-start.md',
      'docs/getting-started/installation.md',
      'docs/getting-started/concepts.md',
      'docs/api-reference/README.md',
      'docs/api-reference/core-types.md',
      'docs/api-reference/tool-creation.md',
      'docs/api-reference/field-builders.md',
      'docs/advanced/performance.md',
      'docs/advanced/security.md',
      'docs/advanced/testing.md',
      'docs/integration/cicd.md',
      'docs/integration/docker.md',
      'docs/integration/monitoring.md',
      'docs/community/contributing.md',
      'docs/community/code-of-conduct.md'
    ];
  }

  /**
   * Run all validation checks
   */
  async validate() {
    console.log('🔍 Validating AI Spine Tools Documentation System...\n');

    await this.validateStructure();
    await this.validateContent();
    await this.validateLinks();
    await this.validateExamples();
    
    this.printResults();
    
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }

  /**
   * Validate documentation file structure
   */
  async validateStructure() {
    console.log('📁 Validating documentation structure...');

    // Check if docs directory exists
    if (!fs.existsSync(this.docsPath)) {
      this.errors.push('Documentation directory does not exist: docs/');
      return;
    }

    // Check required sections
    for (const section of this.requiredSections) {
      const sectionPath = path.join(this.docsPath, section);
      if (!fs.existsSync(sectionPath)) {
        this.errors.push(`Required documentation section missing: docs/${section}/`);
      }
    }

    // Check required files
    for (const filePath of this.requiredFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Required documentation file missing: ${filePath}`);
      }
    }

    console.log('✅ Structure validation completed\n');
  }

  /**
   * Validate content quality and completeness
   */
  async validateContent() {
    console.log('📖 Validating content quality...');

    const markdownFiles = glob.sync('docs/**/*.md', { cwd: path.join(__dirname, '..') });

    for (const filePath of markdownFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      this.validateFileContent(filePath, content);
    }

    console.log('✅ Content validation completed\n');
  }

  /**
   * Validate individual file content
   */
  validateFileContent(filePath, content) {
    // Check for empty files
    if (content.trim().length === 0) {
      this.errors.push(`Empty documentation file: ${filePath}`);
      return;
    }

    // Check for title (h1)
    if (!content.match(/^# .+$/m)) {
      this.warnings.push(`Missing main title (h1) in: ${filePath}`);
    }

    // Check minimum content length
    if (content.length < 500) {
      this.warnings.push(`Very short documentation file (${content.length} chars): ${filePath}`);
    }

    // Check for TODO or placeholder content
    if (content.match(/TODO|FIXME|PLACEHOLDER|TBD|Coming Soon/i)) {
      this.warnings.push(`Contains TODO/placeholder content: ${filePath}`);
    }

    // Check for code examples in technical docs
    if (filePath.includes('api-reference') || filePath.includes('advanced')) {
      if (!content.match(/```[\w]*\n[\s\S]*?\n```/)) {
        this.warnings.push(`Missing code examples in technical doc: ${filePath}`);
      }
    }

    // Check for proper markdown structure
    const lines = content.split('\n');
    let inCodeBlock = false;
    let headingLevels = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track code blocks
      if (line.match(/^```/)) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) continue;

      // Check heading hierarchy
      const headingMatch = line.match(/^(#+)\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2];

        if (level > 6) {
          this.errors.push(`Invalid heading level (${level}) in ${filePath}:${i + 1}: ${title}`);
        }

        // Check for proper heading hierarchy
        if (headingLevels.length > 0) {
          const lastLevel = headingLevels[headingLevels.length - 1];
          if (level > lastLevel + 1) {
            this.warnings.push(`Skipped heading level in ${filePath}:${i + 1}: h${lastLevel} to h${level}`);
          }
        }

        headingLevels.push(level);
      }
    }
  }

  /**
   * Validate internal links
   */
  async validateLinks() {
    console.log('🔗 Validating internal links...');

    const markdownFiles = glob.sync('docs/**/*.md', { cwd: path.join(__dirname, '..') });
    
    for (const filePath of markdownFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      this.validateLinksInFile(filePath, content);
    }

    console.log('✅ Link validation completed\n');
  }

  /**
   * Validate links in a specific file
   */
  validateLinksInFile(filePath, content) {
    // Find all markdown links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      // Skip external links and anchors
      if (linkUrl.startsWith('http') || linkUrl.startsWith('#') || linkUrl.startsWith('mailto:')) {
        continue;
      }

      // Validate relative links
      const currentDir = path.dirname(path.join(__dirname, '..', filePath));
      const targetPath = path.resolve(currentDir, linkUrl);
      
      if (!fs.existsSync(targetPath)) {
        this.errors.push(`Broken internal link in ${filePath}: [${linkText}](${linkUrl})`);
      }
    }

    // Find reference-style links
    const refLinkRegex = /\[([^\]]+)\]\[([^\]]*)\]/g;
    const refDefinitions = new Map();
    
    // Collect reference definitions
    const refDefRegex = /^\[([^\]]+)\]:\s*(.+)$/gm;
    let refMatch;
    while ((refMatch = refDefRegex.exec(content)) !== null) {
      refDefinitions.set(refMatch[1].toLowerCase(), refMatch[2]);
    }
    
    // Check reference links
    while ((match = refLinkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const refKey = (match[2] || linkText).toLowerCase();
      
      if (!refDefinitions.has(refKey)) {
        this.errors.push(`Missing reference definition in ${filePath}: [${linkText}][${match[2] || ''}]`);
      }
    }
  }

  /**
   * Validate code examples
   */
  async validateExamples() {
    console.log('⚡ Validating code examples...');

    const markdownFiles = glob.sync('docs/**/*.md', { cwd: path.join(__dirname, '..') });
    
    for (const filePath of markdownFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      this.validateCodeExamples(filePath, content);
    }

    console.log('✅ Example validation completed\n');
  }

  /**
   * Validate code examples in a file
   */
  validateCodeExamples(filePath, content) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];
      
      // Basic TypeScript/JavaScript validation
      if (language === 'typescript' || language === 'ts' || language === 'javascript' || language === 'js') {
        this.validateTSJSCode(filePath, code, language);
      }

      // Check for common patterns
      if (language === 'bash' || language === 'shell') {
        this.validateBashCode(filePath, code);
      }
    }
  }

  /**
   * Validate TypeScript/JavaScript code examples
   */
  validateTSJSCode(filePath, code, language) {
    // Check for obvious syntax errors
    if (code.match(/\b(function|const|let|var)\s+\w+\s*\(/)) {
      // Looks like function definition - check for basic structure
      const braceCount = (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
      if (Math.abs(braceCount) > 1) {
        this.warnings.push(`Possible unbalanced braces in ${filePath} ${language} code block`);
      }
    }

    // Check for import statements in examples
    if (code.includes('import') && !code.includes('@ai-spine/tools')) {
      // Should probably be importing from our SDK
      if (code.match(/\bcreate[Tt]ool|[Tt]ool[Bb]uilder|stringField|numberField/)) {
        this.warnings.push(`Missing AI Spine SDK import in ${filePath} code example`);
      }
    }

    // Check for incomplete examples
    if (code.includes('...') && code.length < 100) {
      this.warnings.push(`Very short example with ellipsis in ${filePath} - might be incomplete`);
    }
  }

  /**
   * Validate bash/shell code examples
   */
  validateBashCode(filePath, code) {
    // Check for common issues
    if (code.includes('sudo') && filePath.includes('getting-started')) {
      this.warnings.push(`Sudo command in getting started guide: ${filePath}`);
    }

    // Check for placeholder values that should be replaced
    if (code.match(/\b(YOUR_|REPLACE_|CHANGE_|EXAMPLE_)/)) {
      // This is actually good - placeholders should be obvious
    } else if (code.match(/password|secret|key/) && !code.match(/\$\{|YOUR_|REPLACE_/)) {
      this.warnings.push(`Bash example may contain hardcoded credentials: ${filePath}`);
    }
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('📊 Documentation Validation Results\n');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All documentation validation checks passed!');
      console.log('🎉 Documentation system is complete and high quality.\n');
      return;
    }

    if (this.errors.length > 0) {
      console.log(`❌ ${this.errors.length} Error(s) found:`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️  ${this.warnings.length} Warning(s) found:`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
      console.log();
    }

    // Summary
    const total = this.errors.length + this.warnings.length;
    console.log(`📈 Summary: ${total} issue(s) total (${this.errors.length} errors, ${this.warnings.length} warnings)`);
    
    if (this.errors.length > 0) {
      console.log('❌ Documentation validation FAILED - please fix errors before proceeding');
    } else {
      console.log('✅ Documentation validation PASSED - warnings should be addressed when possible');
    }
  }
}

// Generate documentation metrics
class DocumentationMetrics {
  constructor() {
    this.docsPath = path.join(__dirname, '..', 'docs');
  }

  async generateMetrics() {
    console.log('\n📊 Generating Documentation Metrics...\n');

    const markdownFiles = glob.sync('docs/**/*.md', { cwd: path.join(__dirname, '..') });
    
    let totalFiles = 0;
    let totalLines = 0;
    let totalWords = 0;
    let totalCharacters = 0;
    let totalCodeBlocks = 0;
    let totalLinks = 0;
    
    const sectionStats = {};

    for (const filePath of markdownFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      totalFiles++;
      
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(word => word.length > 0).length;
      const characters = content.length;
      const codeBlocks = (content.match(/```/g) || []).length / 2;
      const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
      
      totalLines += lines;
      totalWords += words;
      totalCharacters += characters;
      totalCodeBlocks += codeBlocks;
      totalLinks += links;
      
      // Section statistics
      const section = filePath.split('/')[1];
      if (!sectionStats[section]) {
        sectionStats[section] = {
          files: 0,
          words: 0,
          codeBlocks: 0
        };
      }
      sectionStats[section].files++;
      sectionStats[section].words += words;
      sectionStats[section].codeBlocks += codeBlocks;
    }

    // Print metrics
    console.log('📈 Overall Metrics:');
    console.log(`   Files: ${totalFiles}`);
    console.log(`   Lines: ${totalLines.toLocaleString()}`);
    console.log(`   Words: ${totalWords.toLocaleString()}`);
    console.log(`   Characters: ${totalCharacters.toLocaleString()}`);
    console.log(`   Code Examples: ${totalCodeBlocks}`);
    console.log(`   Internal Links: ${totalLinks}\n`);

    console.log('📂 Section Breakdown:');
    Object.entries(sectionStats)
      .sort(([,a], [,b]) => b.words - a.words)
      .forEach(([section, stats]) => {
        console.log(`   ${section}: ${stats.files} files, ${stats.words.toLocaleString()} words, ${stats.codeBlocks} examples`);
      });

    console.log('\n🎯 Quality Indicators:');
    console.log(`   Avg words per file: ${Math.round(totalWords / totalFiles).toLocaleString()}`);
    console.log(`   Avg examples per file: ${Math.round(totalCodeBlocks / totalFiles * 10) / 10}`);
    console.log(`   Documentation density: ${Math.round(totalWords / totalCharacters * 100)}% words/chars`);
    
    const estimatedReadingTime = Math.ceil(totalWords / 200); // 200 words per minute
    console.log(`   Estimated reading time: ${estimatedReadingTime} minutes`);

    return {
      files: totalFiles,
      lines: totalLines,
      words: totalWords,
      characters: totalCharacters,
      codeBlocks: totalCodeBlocks,
      links: totalLinks,
      sections: sectionStats
    };
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DocumentationValidator();
  const metrics = new DocumentationMetrics();
  
  async function main() {
    try {
      await validator.validate();
      await metrics.generateMetrics();
    } catch (error) {
      console.error('❌ Documentation validation failed:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { DocumentationValidator, DocumentationMetrics };