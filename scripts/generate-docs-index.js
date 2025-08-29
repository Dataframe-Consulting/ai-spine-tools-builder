#!/usr/bin/env node

/**
 * Documentation index generator for AI Spine Tools SDK
 * 
 * This script automatically generates navigation indexes and cross-references
 * for the documentation system, ensuring all content is discoverable.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class DocumentationIndexGenerator {
  constructor() {
    this.docsPath = path.join(__dirname, '..', 'docs');
    this.sections = [
      {
        name: 'getting-started',
        title: 'Getting Started',
        description: 'Quick start guides and fundamental concepts',
        icon: '🚀'
      },
      {
        name: 'api-reference',
        title: 'API Reference',
        description: 'Complete API documentation and reference',
        icon: '📚'
      },
      {
        name: 'advanced',
        title: 'Advanced Usage',
        description: 'Advanced patterns and optimization techniques',
        icon: '⚡'
      },
      {
        name: 'integration',
        title: 'Integration Guides',
        description: 'CI/CD, deployment, and integration patterns',
        icon: '🔧'
      },
      {
        name: 'examples',
        title: 'Examples & Tutorials',
        description: 'Working examples and step-by-step tutorials',
        icon: '💡'
      },
      {
        name: 'community',
        title: 'Community',
        description: 'Contributing guidelines and community resources',
        icon: '🤝'
      }
    ];
  }

  /**
   * Generate all documentation indexes
   */
  async generateAll() {
    console.log('📝 Generating documentation indexes...\n');

    await this.generateMainIndex();
    await this.generateSectionIndexes();
    await this.generateSitemap();
    
    console.log('✅ Documentation indexes generated successfully!\n');
  }

  /**
   * Generate main documentation index
   */
  async generateMainIndex() {
    console.log('📄 Generating main documentation index...');

    const sections = [];
    
    for (const section of this.sections) {
      const sectionPath = path.join(this.docsPath, section.name);
      
      if (fs.existsSync(sectionPath)) {
        const files = await this.getDocumentationFiles(sectionPath);
        const pages = files.map(file => this.extractPageInfo(file, section.name));
        
        sections.push({
          ...section,
          pageCount: pages.length,
          pages: pages.slice(0, 5), // Show first 5 pages in main index
          hasMore: pages.length > 5
        });
      }
    }

    const indexContent = this.generateMainIndexContent(sections);
    
    // Write main index
    fs.writeFileSync(path.join(this.docsPath, 'README.md'), indexContent);
    
    console.log('✅ Main index updated');
  }

  /**
   * Generate section-specific indexes
   */
  async generateSectionIndexes() {
    console.log('📑 Generating section indexes...');

    for (const section of this.sections) {
      const sectionPath = path.join(this.docsPath, section.name);
      
      if (fs.existsSync(sectionPath)) {
        await this.generateSectionIndex(section);
      }
    }

    console.log('✅ Section indexes updated');
  }

  /**
   * Generate index for a specific section
   */
  async generateSectionIndex(section) {
    const sectionPath = path.join(this.docsPath, section.name);
    const files = await this.getDocumentationFiles(sectionPath);
    const pages = files.map(file => this.extractPageInfo(file, section.name));
    
    // Sort pages by priority/order
    pages.sort((a, b) => {
      const priorityOrder = {
        'README': 0,
        'index': 1,
        'quick-start': 2,
        'installation': 3,
        'concepts': 4
      };
      
      const getPriority = (name) => priorityOrder[name] ?? 10;
      return getPriority(a.slug) - getPriority(b.slug);
    });

    const indexContent = this.generateSectionIndexContent(section, pages);
    
    // Write section index
    const readmePath = path.join(sectionPath, 'README.md');
    fs.writeFileSync(readmePath, indexContent);
  }

  /**
   * Get all documentation files in a directory
   */
  async getDocumentationFiles(dirPath) {
    const pattern = path.join(dirPath, '**/*.md');
    return glob.sync(pattern).filter(file => 
      !file.endsWith('/README.md') // Exclude README files from listing
    );
  }

  /**
   * Extract page information from a markdown file
   */
  extractPageInfo(filePath, section) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.docsPath, filePath);
    const fileName = path.basename(filePath, '.md');
    
    // Extract title from first h1 heading
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : this.titleFromFilename(fileName);
    
    // Extract description from content (first paragraph after title)
    const descriptionMatch = content.match(/^# .+$\s*\n\s*(.+?)(?:\n\n|\n$)/m);
    const description = descriptionMatch ? 
      descriptionMatch[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') : // Remove links
      'No description available';
    
    // Extract metadata
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    const hasExamples = content.includes('```');
    const linkCount = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;

    return {
      title,
      description: description.slice(0, 150) + (description.length > 150 ? '...' : ''),
      slug: fileName,
      path: relativePath,
      section,
      wordCount,
      readingTime,
      hasExamples,
      linkCount,
      lastModified: fs.statSync(filePath).mtime
    };
  }

  /**
   * Convert filename to readable title
   */
  titleFromFilename(filename) {
    return filename
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate main index content
   */
  generateMainIndexContent(sections) {
    const lastUpdated = new Date().toISOString().split('T')[0];
    
    let content = `# AI Spine Tools SDK Documentation

Welcome to the AI Spine Tools SDK documentation! This comprehensive documentation system provides everything you need to build, deploy, and maintain AI-agent-compatible tools using our powerful framework.

## 📚 Documentation Structure

`;

    // Add section overview
    for (const section of sections) {
      content += `### ${section.icon} ${section.title}
${section.description}

`;
      
      if (section.pages.length > 0) {
        for (const page of section.pages) {
          const readingTime = page.readingTime > 0 ? ` (${page.readingTime} min)` : '';
          const examples = page.hasExamples ? ' 📝' : '';
          content += `- [${page.title}](./${page.path})${readingTime}${examples}\n`;
        }
        
        if (section.hasMore) {
          content += `- [View all ${section.title} guides...](./${section.name}/README.md)\n`;
        }
      }
      
      content += '\n';
    }

    // Add quick navigation
    content += `## 🚀 Quick Navigation

| I want to... | Go to... |
|---------------|----------|
| Get started quickly | [Quick Start Guide](./getting-started/quick-start.md) |
| Learn the framework concepts | [Core Concepts](./getting-started/concepts.md) |
| See working examples | [Example Tools](./examples/README.md) |
| Find API documentation | [API Reference](./api-reference/README.md) |
| Optimize tool performance | [Performance Guide](./advanced/performance.md) |
| Deploy to production | [Integration Guides](./integration/README.md) |
| Contribute to the project | [Contributing Guide](./community/contributing.md) |
| Get help with issues | [Troubleshooting](./integration/troubleshooting.md) |

## 📖 Documentation Standards

This documentation follows these principles:
- **Progressive Complexity**: Content flows from beginner to advanced topics
- **Practical Examples**: Every concept includes working code examples
- **Comprehensive Coverage**: All public APIs and common patterns are documented
- **Regular Updates**: Documentation is maintained alongside code changes
- **Community Driven**: Community contributions are welcomed and encouraged

## 🔄 Documentation Status

| Section | Files | Status | Last Updated |
|---------|-------|--------|--------------|
`;

    // Add section status table
    for (const section of sections) {
      const status = section.pageCount > 0 ? '✅ Complete' : '⚠️ In Progress';
      content += `| ${section.title} | ${section.pageCount} | ${status} | ${lastUpdated} |\n`;
    }

    content += `
## 🤝 Contributing to Documentation

We welcome contributions to improve this documentation! Please see our [Contributing Guide](./community/contributing.md) for:

- Documentation writing guidelines
- Review process for changes
- Style guide and formatting standards
- Translation contribution process

## 📞 Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/ai-spine/tools-sdk/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/ai-spine/tools-sdk/discussions)
- **Community Chat**: [Join our Discord community](https://discord.gg/ai-spine-tools)
- **Email Support**: documentation@ai-spine.com

---

**Last Updated**: ${lastUpdated}  
**Documentation Version**: 1.0.0  
**SDK Version**: 1.0.0+`;

    return content;
  }

  /**
   * Generate section index content
   */
  generateSectionIndexContent(section, pages) {
    let content = `# ${section.title}

${section.description}

## 📋 Contents

`;

    // Group pages by type/category if applicable
    const categories = this.categorizePages(pages, section.name);
    
    for (const [categoryName, categoryPages] of Object.entries(categories)) {
      if (categoryName !== 'default') {
        content += `### ${categoryName}\n\n`;
      }
      
      for (const page of categoryPages) {
        const readingTime = page.readingTime > 0 ? ` (${page.readingTime} min read)` : '';
        const examples = page.hasExamples ? ' 📝' : '';
        const lastMod = page.lastModified.toISOString().split('T')[0];
        
        content += `- **[${page.title}](./${page.slug}.md)**${readingTime}${examples}  \n`;
        content += `  ${page.description}  \n`;
        content += `  *Updated: ${lastMod}*\n\n`;
      }
    }

    // Add navigation
    content += `## 📖 Related Documentation

`;

    // Add related sections
    const relatedSections = this.getRelatedSections(section.name);
    for (const relatedSection of relatedSections) {
      content += `- [${relatedSection.title}](../${relatedSection.name}/README.md) - ${relatedSection.description}\n`;
    }

    content += `
- [← Back to Documentation Home](../README.md)

---

**Section**: ${section.title}  
**Pages**: ${pages.length}  
**Total Reading Time**: ~${pages.reduce((sum, page) => sum + page.readingTime, 0)} minutes`;

    return content;
  }

  /**
   * Categorize pages within a section
   */
  categorizePages(pages, sectionName) {
    const categories = { default: [] };
    
    // Define category mappings
    const categoryMappings = {
      'api-reference': {
        'Core APIs': ['tool-creation', 'core-types', 'validation'],
        'Field Builders': ['field-builders'],
        'HTTP API': ['http-api'],
        'CLI Tools': ['cli'],
        'Testing': ['testing']
      },
      'advanced': {
        'Performance': ['performance', 'optimization'],
        'Security': ['security', 'authentication'],
        'Development': ['testing', 'debugging']
      },
      'integration': {
        'CI/CD': ['cicd', 'github-actions', 'automation'],
        'Deployment': ['docker', 'kubernetes', 'cloud'],
        'Monitoring': ['monitoring', 'logging', 'metrics']
      }
    };

    if (categoryMappings[sectionName]) {
      for (const page of pages) {
        let categorized = false;
        
        for (const [categoryName, keywords] of Object.entries(categoryMappings[sectionName])) {
          if (keywords.some(keyword => page.slug.includes(keyword) || page.title.toLowerCase().includes(keyword.toLowerCase()))) {
            if (!categories[categoryName]) {
              categories[categoryName] = [];
            }
            categories[categoryName].push(page);
            categorized = true;
            break;
          }
        }
        
        if (!categorized) {
          categories.default.push(page);
        }
      }
    } else {
      categories.default = pages;
    }

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, pages]) => pages.length > 0)
    );
  }

  /**
   * Get related sections for cross-referencing
   */
  getRelatedSections(sectionName) {
    const relationships = {
      'getting-started': ['api-reference', 'examples'],
      'api-reference': ['getting-started', 'advanced', 'examples'],
      'advanced': ['api-reference', 'integration'],
      'integration': ['advanced', 'community'],
      'examples': ['getting-started', 'api-reference'],
      'community': ['getting-started', 'integration']
    };

    const relatedNames = relationships[sectionName] || [];
    return this.sections.filter(section => relatedNames.includes(section.name));
  }

  /**
   * Generate documentation sitemap
   */
  async generateSitemap() {
    console.log('🗺️ Generating documentation sitemap...');

    const allFiles = glob.sync('docs/**/*.md', { cwd: path.join(__dirname, '..') });
    const pages = [];

    for (const filePath of allFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      const stat = fs.statSync(fullPath);
      const section = filePath.split('/')[1];
      const pageInfo = this.extractPageInfo(fullPath, section);
      
      pages.push({
        ...pageInfo,
        fullPath: filePath,
        size: stat.size,
        lastModified: stat.mtime.toISOString()
      });
    }

    // Sort by section and then by title
    pages.sort((a, b) => {
      if (a.section !== b.section) {
        const sectionOrder = this.sections.map(s => s.name);
        return sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
      }
      return a.title.localeCompare(b.title);
    });

    const sitemapContent = this.generateSitemapContent(pages);
    
    // Write sitemap
    fs.writeFileSync(path.join(this.docsPath, 'SITEMAP.md'), sitemapContent);
    
    console.log('✅ Sitemap generated');
  }

  /**
   * Generate sitemap content
   */
  generateSitemapContent(pages) {
    let content = `# Documentation Sitemap

This is a complete index of all documentation pages in the AI Spine Tools SDK documentation.

**Total Pages**: ${pages.length}  
**Last Updated**: ${new Date().toISOString().split('T')[0]}

## 📋 All Documentation Pages

`;

    let currentSection = null;

    for (const page of pages) {
      if (page.section !== currentSection) {
        currentSection = page.section;
        const sectionInfo = this.sections.find(s => s.name === currentSection);
        content += `\n### ${sectionInfo?.icon || '📄'} ${sectionInfo?.title || currentSection}\n\n`;
      }

      const readingTime = page.readingTime > 0 ? ` (${page.readingTime}m)` : '';
      const examples = page.hasExamples ? ' 📝' : '';
      const size = `${Math.round(page.size / 1024)}KB`;
      
      content += `- **[${page.title}](./${page.path})**${readingTime}${examples}  \n`;
      content += `  ${page.description}  \n`;
      content += `  *${page.wordCount} words • ${size} • Updated ${page.lastModified.split('T')[0]}*\n\n`;
    }

    content += `## 📊 Statistics

`;

    // Generate statistics
    const stats = this.calculateDocumentationStats(pages);
    
    content += `- **Total files**: ${stats.totalFiles}\n`;
    content += `- **Total words**: ${stats.totalWords.toLocaleString()}\n`;
    content += `- **Total size**: ${Math.round(stats.totalSize / 1024)}KB\n`;
    content += `- **Avg words per page**: ${Math.round(stats.avgWordsPerPage)}\n`;
    content += `- **Pages with examples**: ${stats.pagesWithExamples}\n`;
    content += `- **Estimated reading time**: ${Math.ceil(stats.totalWords / 200)} minutes\n`;

    content += `\n### By Section\n\n`;
    
    for (const [section, sectionStats] of Object.entries(stats.bySection)) {
      const sectionInfo = this.sections.find(s => s.name === section);
      content += `- **${sectionInfo?.title || section}**: ${sectionStats.files} files, ${sectionStats.words.toLocaleString()} words\n`;
    }

    return content;
  }

  /**
   * Calculate documentation statistics
   */
  calculateDocumentationStats(pages) {
    const stats = {
      totalFiles: pages.length,
      totalWords: 0,
      totalSize: 0,
      pagesWithExamples: 0,
      bySection: {}
    };

    for (const page of pages) {
      stats.totalWords += page.wordCount;
      stats.totalSize += page.size;
      
      if (page.hasExamples) {
        stats.pagesWithExamples++;
      }

      if (!stats.bySection[page.section]) {
        stats.bySection[page.section] = {
          files: 0,
          words: 0
        };
      }
      
      stats.bySection[page.section].files++;
      stats.bySection[page.section].words += page.wordCount;
    }

    stats.avgWordsPerPage = stats.totalWords / stats.totalFiles;

    return stats;
  }
}

// Run generator if called directly
if (require.main === module) {
  const generator = new DocumentationIndexGenerator();
  
  async function main() {
    try {
      await generator.generateAll();
      console.log('🎉 Documentation index generation completed successfully!');
    } catch (error) {
      console.error('❌ Documentation index generation failed:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { DocumentationIndexGenerator };