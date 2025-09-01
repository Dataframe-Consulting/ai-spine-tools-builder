#!/usr/bin/env node

/**
 * API Comparison Script for Breaking Change Detection
 * 
 * This script compares two API surface extractions to detect breaking changes
 * between versions. Used in CI pipeline to prevent accidental breaking changes.
 * 
 * Features:
 * - Interface signature comparison
 * - Function signature validation
 * - Type definition change detection
 * - Semantic versioning guidance
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * API Comparison and Breaking Change Detector
 */
class APIComparator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.strictMode = options.strict || false;
    this.comparison = {
      breaking: [],
      nonBreaking: [],
      additions: [],
      summary: {}
    };
  }

  log(message, level = 'info') {
    const prefix = {
      info: `${colors.blue}ℹ${colors.reset}`,
      success: `${colors.green}✅${colors.reset}`,
      warning: `${colors.yellow}⚠️${colors.reset}`,
      error: `${colors.red}❌${colors.reset}`,
      breaking: `${colors.red}💥${colors.reset}`,
      addition: `${colors.green}➕${colors.reset}`
    };

    if (this.verbose || level !== 'debug') {
      console.log(`${prefix[level]} ${message}`);
    }
  }

  /**
   * Compare two API surfaces
   */
  compareAPIs(baselinePath, currentPath) {
    this.log('Loading API surface files...');
    
    const baseline = this.loadAPI(baselinePath);
    const current = this.loadAPI(currentPath);
    
    this.log(`Comparing API changes from v${baseline.version} to v${current.version}...`);
    
    // Compare each package
    const allPackageNames = new Set([
      ...Object.keys(baseline.packages),
      ...Object.keys(current.packages)
    ]);
    
    allPackageNames.forEach(packageName => {
      this.comparePackage(packageName, baseline.packages[packageName], current.packages[packageName]);
    });
    
    this.generateSummary();
    this.printResults();
    
    return this.comparison;
  }

  /**
   * Load API surface from file
   */
  loadAPI(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`API file not found: ${filePath}`);
    }
    
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to parse API file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Compare single package API
   */
  comparePackage(packageName, baselinePackage, currentPackage) {
    if (!baselinePackage && currentPackage) {
      this.comparison.additions.push({
        type: 'package',
        package: packageName,
        change: 'Package added',
        item: packageName
      });
      return;
    }
    
    if (baselinePackage && !currentPackage) {
      this.comparison.breaking.push({
        type: 'package',
        package: packageName,
        change: 'Package removed',
        item: packageName,
        severity: 'major'
      });
      return;
    }
    
    if (baselinePackage.error || currentPackage.error) {
      this.log(`Skipping package ${packageName} due to extraction errors`, 'warning');
      return;
    }
    
    // Compare different aspects of the package
    this.compareInterfaces(packageName, baselinePackage.interfaces, currentPackage.interfaces);
    this.compareTypes(packageName, baselinePackage.types, currentPackage.types);
    this.compareFunctions(packageName, baselinePackage.functions, currentPackage.functions);
    this.compareClasses(packageName, baselinePackage.classes, currentPackage.classes);
    this.compareExports(packageName, baselinePackage.exports, currentPackage.exports);
  }

  /**
   * Compare interfaces
   */
  compareInterfaces(packageName, baselineInterfaces, currentInterfaces) {
    const baselineMap = new Map(baselineInterfaces?.map(iface => [iface.name, iface]) || []);
    const currentMap = new Map(currentInterfaces?.map(iface => [iface.name, iface]) || []);
    
    // Check for removed interfaces
    baselineMap.forEach((baseline, name) => {
      if (!currentMap.has(name)) {
        this.comparison.breaking.push({
          type: 'interface',
          package: packageName,
          change: 'Interface removed',
          item: name,
          severity: 'major'
        });
      }
    });
    
    // Check for added interfaces
    currentMap.forEach((current, name) => {
      if (!baselineMap.has(name)) {
        this.comparison.additions.push({
          type: 'interface',
          package: packageName,
          change: 'Interface added',
          item: name
        });
      }
    });
    
    // Check for interface changes
    baselineMap.forEach((baseline, name) => {
      const current = currentMap.get(name);
      if (current) {
        this.compareInterfaceMembers(packageName, name, baseline.members, current.members);
        this.compareHeritage(packageName, name, 'interface', baseline.heritage, current.heritage);
      }
    });
  }

  /**
   * Compare interface members
   */
  compareInterfaceMembers(packageName, interfaceName, baselineMembers, currentMembers) {
    const baselineMap = new Map(baselineMembers?.map(member => [member.name, member]) || []);
    const currentMap = new Map(currentMembers?.map(member => [member.name, member]) || []);
    
    // Check for removed members
    baselineMap.forEach((baseline, name) => {
      if (!currentMap.has(name)) {
        this.comparison.breaking.push({
          type: 'interface_member',
          package: packageName,
          change: 'Interface member removed',
          item: `${interfaceName}.${name}`,
          severity: 'major'
        });
      }
    });
    
    // Check for added members
    currentMap.forEach((current, name) => {
      if (!baselineMap.has(name)) {
        this.comparison.additions.push({
          type: 'interface_member',
          package: packageName,
          change: 'Interface member added',
          item: `${interfaceName}.${name}`
        });
      }
    });
    
    // Check for member changes
    baselineMap.forEach((baseline, name) => {
      const current = currentMap.get(name);
      if (current) {
        // Check if required property became optional (non-breaking)
        if (baseline.optional === false && current.optional === true) {
          this.comparison.nonBreaking.push({
            type: 'interface_member',
            package: packageName,
            change: 'Property made optional',
            item: `${interfaceName}.${name}`
          });
        }
        
        // Check if optional property became required (breaking)
        if (baseline.optional === true && current.optional === false) {
          this.comparison.breaking.push({
            type: 'interface_member',
            package: packageName,
            change: 'Property made required',
            item: `${interfaceName}.${name}`,
            severity: 'major'
          });
        }
        
        // Check type signature changes
        if (baseline.typeSignature !== current.typeSignature) {
          this.comparison.breaking.push({
            type: 'interface_member',
            package: packageName,
            change: 'Property type changed',
            item: `${interfaceName}.${name}`,
            details: `${baseline.typeSignature} → ${current.typeSignature}`,
            severity: 'major'
          });
        }
      }
    });
  }

  /**
   * Compare heritage clauses (extends/implements)
   */
  compareHeritage(packageName, itemName, itemType, baselineHeritage, currentHeritage) {
    const baselineNames = new Set(baselineHeritage?.map(h => h.name) || []);
    const currentNames = new Set(currentHeritage?.map(h => h.name) || []);
    
    // Check for removed heritage
    baselineNames.forEach(name => {
      if (!currentNames.has(name)) {
        this.comparison.breaking.push({
          type: `${itemType}_heritage`,
          package: packageName,
          change: 'Heritage removed',
          item: `${itemName} extends/implements ${name}`,
          severity: 'major'
        });
      }
    });
    
    // Check for added heritage
    currentNames.forEach(name => {
      if (!baselineNames.has(name)) {
        this.comparison.additions.push({
          type: `${itemType}_heritage`,
          package: packageName,
          change: 'Heritage added',
          item: `${itemName} extends/implements ${name}`
        });
      }
    });
  }

  /**
   * Compare type aliases
   */
  compareTypes(packageName, baselineTypes, currentTypes) {
    const baselineMap = new Map(baselineTypes?.map(type => [type.name, type]) || []);
    const currentMap = new Map(currentTypes?.map(type => [type.name, type]) || []);
    
    // Check for removed types
    baselineMap.forEach((baseline, name) => {
      if (!currentMap.has(name)) {
        this.comparison.breaking.push({
          type: 'type',
          package: packageName,
          change: 'Type removed',
          item: name,
          severity: 'major'
        });
      }
    });
    
    // Check for added types
    currentMap.forEach((current, name) => {
      if (!baselineMap.has(name)) {
        this.comparison.additions.push({
          type: 'type',
          package: packageName,
          change: 'Type added',
          item: name
        });
      }
    });
    
    // Check for type changes
    baselineMap.forEach((baseline, name) => {
      const current = currentMap.get(name);
      if (current && baseline.definition !== current.definition) {
        this.comparison.breaking.push({
          type: 'type',
          package: packageName,
          change: 'Type definition changed',
          item: name,
          details: `${baseline.definition} → ${current.definition}`,
          severity: 'major'
        });
      }
    });
  }

  /**
   * Compare functions
   */
  compareFunctions(packageName, baselineFunctions, currentFunctions) {
    const baselineMap = new Map(baselineFunctions?.map(fn => [fn.name, fn]) || []);
    const currentMap = new Map(currentFunctions?.map(fn => [fn.name, fn]) || []);
    
    // Check for removed functions
    baselineMap.forEach((baseline, name) => {
      if (!currentMap.has(name)) {
        this.comparison.breaking.push({
          type: 'function',
          package: packageName,
          change: 'Function removed',
          item: name,
          severity: 'major'
        });
      }
    });
    
    // Check for added functions
    currentMap.forEach((current, name) => {
      if (!baselineMap.has(name)) {
        this.comparison.additions.push({
          type: 'function',
          package: packageName,
          change: 'Function added',
          item: name
        });
      }
    });
    
    // Check for function signature changes
    baselineMap.forEach((baseline, name) => {
      const current = currentMap.get(name);
      if (current) {
        this.compareFunctionSignatures(packageName, name, baseline, current);
      }
    });
  }

  /**
   * Compare function signatures
   */
  compareFunctionSignatures(packageName, functionName, baseline, current) {
    // Check parameter changes
    const baselineParams = baseline.parameters || [];
    const currentParams = current.parameters || [];
    
    // Check if parameters were removed
    if (currentParams.length < baselineParams.length) {
      this.comparison.breaking.push({
        type: 'function',
        package: packageName,
        change: 'Function parameters reduced',
        item: functionName,
        severity: 'major'
      });
    }
    
    // Check parameter type changes
    baselineParams.forEach((baselineParam, index) => {
      const currentParam = currentParams[index];
      if (currentParam) {
        if (baselineParam.type !== currentParam.type) {
          this.comparison.breaking.push({
            type: 'function',
            package: packageName,
            change: 'Function parameter type changed',
            item: `${functionName}(${baselineParam.name})`,
            details: `${baselineParam.type} → ${currentParam.type}`,
            severity: 'major'
          });
        }
        
        // Check if optional parameter became required
        if (baselineParam.optional && !currentParam.optional) {
          this.comparison.breaking.push({
            type: 'function',
            package: packageName,
            change: 'Function parameter made required',
            item: `${functionName}(${baselineParam.name})`,
            severity: 'major'
          });
        }
      }
    });
    
    // Check return type changes
    if (baseline.returnType !== current.returnType) {
      this.comparison.breaking.push({
        type: 'function',
        package: packageName,
        change: 'Function return type changed',
        item: functionName,
        details: `${baseline.returnType} → ${current.returnType}`,
        severity: 'major'
      });
    }
  }

  /**
   * Compare classes
   */
  compareClasses(packageName, baselineClasses, currentClasses) {
    const baselineMap = new Map(baselineClasses?.map(cls => [cls.name, cls]) || []);
    const currentMap = new Map(currentClasses?.map(cls => [cls.name, cls]) || []);
    
    // Check for removed classes
    baselineMap.forEach((baseline, name) => {
      if (!currentMap.has(name)) {
        this.comparison.breaking.push({
          type: 'class',
          package: packageName,
          change: 'Class removed',
          item: name,
          severity: 'major'
        });
      }
    });
    
    // Check for added classes
    currentMap.forEach((current, name) => {
      if (!baselineMap.has(name)) {
        this.comparison.additions.push({
          type: 'class',
          package: packageName,
          change: 'Class added',
          item: name
        });
      }
    });
    
    // Check for class changes
    baselineMap.forEach((baseline, name) => {
      const current = currentMap.get(name);
      if (current) {
        this.compareClassMembers(packageName, name, baseline, current);
        this.compareHeritage(packageName, name, 'class', baseline.heritage, current.heritage);
      }
    });
  }

  /**
   * Compare class members
   */
  compareClassMembers(packageName, className, baseline, current) {
    // Compare methods
    const baselineMethodMap = new Map(baseline.methods?.map(method => [method.name, method]) || []);
    const currentMethodMap = new Map(current.methods?.map(method => [method.name, method]) || []);
    
    baselineMethodMap.forEach((baselineMethod, name) => {
      if (!currentMethodMap.has(name)) {
        this.comparison.breaking.push({
          type: 'class_method',
          package: packageName,
          change: 'Class method removed',
          item: `${className}.${name}`,
          severity: 'major'
        });
      } else {
        const currentMethod = currentMethodMap.get(name);
        this.compareFunctionSignatures(packageName, `${className}.${name}`, baselineMethod, currentMethod);
      }
    });
    
    // Compare properties
    const baselinePropMap = new Map(baseline.properties?.map(prop => [prop.name, prop]) || []);
    const currentPropMap = new Map(current.properties?.map(prop => [prop.name, prop]) || []);
    
    baselinePropMap.forEach((baselineProp, name) => {
      if (!currentPropMap.has(name)) {
        this.comparison.breaking.push({
          type: 'class_property',
          package: packageName,
          change: 'Class property removed',
          item: `${className}.${name}`,
          severity: 'major'
        });
      } else {
        const currentProp = currentPropMap.get(name);
        if (baselineProp.type !== currentProp.type) {
          this.comparison.breaking.push({
            type: 'class_property',
            package: packageName,
            change: 'Class property type changed',
            item: `${className}.${name}`,
            details: `${baselineProp.type} → ${currentProp.type}`,
            severity: 'major'
          });
        }
      }
    });
  }

  /**
   * Compare exports
   */
  compareExports(packageName, baselineExports, currentExports) {
    const baselineNames = new Set(baselineExports?.map(exp => exp.name) || []);
    const currentNames = new Set(currentExports?.map(exp => exp.name) || []);
    
    // Check for removed exports
    baselineNames.forEach(name => {
      if (!currentNames.has(name)) {
        this.comparison.breaking.push({
          type: 'export',
          package: packageName,
          change: 'Export removed',
          item: name,
          severity: 'major'
        });
      }
    });
    
    // Check for added exports
    currentNames.forEach(name => {
      if (!baselineNames.has(name)) {
        this.comparison.additions.push({
          type: 'export',
          package: packageName,
          change: 'Export added',
          item: name
        });
      }
    });
  }

  /**
   * Generate comparison summary
   */
  generateSummary() {
    this.comparison.summary = {
      breakingChanges: this.comparison.breaking.length,
      nonBreakingChanges: this.comparison.nonBreaking.length,
      additions: this.comparison.additions.length,
      recommendedVersionBump: this.getRecommendedVersionBump(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get recommended semantic version bump
   */
  getRecommendedVersionBump() {
    if (this.comparison.breaking.length > 0) {
      return 'major';
    } else if (this.comparison.additions.length > 0) {
      return 'minor';
    } else if (this.comparison.nonBreaking.length > 0) {
      return 'patch';
    } else {
      return 'none';
    }
  }

  /**
   * Print comparison results
   */
  printResults() {
    console.log(`\n${colors.bold}API Comparison Results${colors.reset}`);
    console.log(`${colors.cyan}Breaking Changes: ${this.comparison.breaking.length}${colors.reset}`);
    console.log(`${colors.cyan}Additions: ${this.comparison.additions.length}${colors.reset}`);
    console.log(`${colors.cyan}Non-breaking Changes: ${this.comparison.nonBreaking.length}${colors.reset}`);
    console.log(`${colors.cyan}Recommended Version Bump: ${this.comparison.summary.recommendedVersionBump}${colors.reset}\n`);
    
    // Print breaking changes
    if (this.comparison.breaking.length > 0) {
      console.log(`${colors.red}${colors.bold}💥 Breaking Changes:${colors.reset}`);
      this.comparison.breaking.forEach(change => {
        console.log(`  ${colors.red}❌${colors.reset} ${change.package}: ${change.change} - ${change.item}`);
        if (change.details) {
          console.log(`     ${colors.yellow}${change.details}${colors.reset}`);
        }
      });
      console.log('');
    }
    
    // Print additions
    if (this.comparison.additions.length > 0 && this.verbose) {
      console.log(`${colors.green}${colors.bold}➕ Additions:${colors.reset}`);
      this.comparison.additions.forEach(change => {
        console.log(`  ${colors.green}✅${colors.reset} ${change.package}: ${change.change} - ${change.item}`);
      });
      console.log('');
    }
    
    // Exit with error if breaking changes found
    if (this.comparison.breaking.length > 0) {
      console.log(`${colors.red}${colors.bold}❌ Breaking changes detected!${colors.reset}`);
      console.log(`${colors.yellow}Please review the changes above and consider:${colors.reset}`);
      console.log(`${colors.yellow}1. Whether these changes are intentional${colors.reset}`);
      console.log(`${colors.yellow}2. Updating the major version number${colors.reset}`);
      console.log(`${colors.yellow}3. Providing migration documentation${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`${colors.green}✅ No breaking changes detected${colors.reset}`);
    }
  }
}

// CLI handling
if (require.main === module) {
  const [baselinePath, currentPath] = process.argv.slice(2);
  
  if (!baselinePath || !currentPath) {
    console.error('Usage: node compare-api.js <baseline.json> <current.json>');
    process.exit(1);
  }
  
  const options = {
    verbose: process.argv.includes('--verbose'),
    strict: process.argv.includes('--strict')
  };
  
  const comparator = new APIComparator(options);
  
  try {
    comparator.compareAPIs(baselinePath, currentPath);
  } catch (error) {
    console.error('API comparison failed:', error.message);
    process.exit(1);
  }
}

module.exports = APIComparator;