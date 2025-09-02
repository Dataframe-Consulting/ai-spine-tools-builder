#!/usr/bin/env node

/**
 * API Extraction Script for Breaking Change Detection
 *
 * This script extracts the public API surface from built packages
 * to enable automated breaking change detection in CI pipeline.
 *
 * Features:
 * - TypeScript declaration file analysis
 * - Export signature extraction
 * - Interface and type definition capture
 * - Package boundary identification
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

/**
 * API Surface Extractor
 */
class APIExtractor {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.packagesDir = path.join(__dirname, '..', 'packages');
    this.api = {
      packages: {},
      timestamp: new Date().toISOString(),
      version: this.getSDKVersion(),
    };
  }

  /**
   * Get SDK version from package.json
   */
  getSDKVersion() {
    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      return 'unknown';
    }
  }

  log(message, level = 'info') {
    if (this.verbose) {
      const prefix =
        level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
      console.error(`${prefix} ${message}`);
    }
  }

  /**
   * Extract API from all packages
   */
  extractAPI() {
    this.log('Extracting API surface from all packages...');

    const packages = fs
      .readdirSync(this.packagesDir)
      .filter(dir =>
        fs.statSync(path.join(this.packagesDir, dir)).isDirectory()
      );

    packages.forEach(packageName => {
      try {
        const packageAPI = this.extractPackageAPI(packageName);
        this.api.packages[packageName] = packageAPI;
        this.log(`Extracted API for package: ${packageName}`);
      } catch (error) {
        this.log(
          `Failed to extract API for ${packageName}: ${error.message}`,
          'error'
        );
        this.api.packages[packageName] = { error: error.message };
      }
    });

    return this.api;
  }

  /**
   * Extract API from a single package
   */
  extractPackageAPI(packageName) {
    const packageDir = path.join(this.packagesDir, packageName);
    const distDir = path.join(packageDir, 'dist');

    if (!fs.existsSync(distDir)) {
      throw new Error(`Build directory not found: ${distDir}`);
    }

    // Find main declaration file
    const packageJsonPath = path.join(packageDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const mainDeclaration =
      packageJson.types || packageJson.typings || 'dist/index.d.ts';
    const declarationPath = path.join(packageDir, mainDeclaration);

    if (!fs.existsSync(declarationPath)) {
      throw new Error(`Declaration file not found: ${declarationPath}`);
    }

    const packageAPI = {
      name: packageJson.name,
      version: packageJson.version,
      exports: this.extractExports(declarationPath),
      interfaces: this.extractInterfaces(declarationPath),
      types: this.extractTypes(declarationPath),
      functions: this.extractFunctions(declarationPath),
      classes: this.extractClasses(declarationPath),
    };

    return packageAPI;
  }

  /**
   * Parse TypeScript declaration file
   */
  parseDeclarationFile(filePath) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    return ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
  }

  /**
   * Extract export statements
   */
  extractExports(declarationPath) {
    const sourceFile = this.parseDeclarationFile(declarationPath);
    const exports = [];

    ts.forEachChild(sourceFile, node => {
      if (this.hasExportModifier(node)) {
        if (ts.isInterfaceDeclaration(node)) {
          exports.push({
            type: 'interface',
            name: node.name.text,
          });
        } else if (ts.isTypeAliasDeclaration(node)) {
          exports.push({
            type: 'type',
            name: node.name.text,
          });
        } else if (ts.isFunctionDeclaration(node)) {
          exports.push({
            type: 'function',
            name: node.name?.text || 'anonymous',
          });
        } else if (ts.isClassDeclaration(node)) {
          exports.push({
            type: 'class',
            name: node.name?.text || 'anonymous',
          });
        } else if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach(decl => {
            exports.push({
              type: 'variable',
              name: decl.name.text,
            });
          });
        }
      }
    });

    return exports;
  }

  /**
   * Extract interface definitions
   */
  extractInterfaces(declarationPath) {
    const sourceFile = this.parseDeclarationFile(declarationPath);
    const interfaces = [];

    ts.forEachChild(sourceFile, node => {
      if (ts.isInterfaceDeclaration(node) && this.hasExportModifier(node)) {
        const interfaceInfo = {
          name: node.name.text,
          members: [],
          heritage: [],
        };

        // Extract heritage (extends clause)
        if (node.heritageClauses) {
          node.heritageClauses.forEach(clause => {
            clause.types.forEach(type => {
              interfaceInfo.heritage.push({
                name: type.expression.text,
                typeArguments:
                  type.typeArguments?.map(arg => arg.getText()) || [],
              });
            });
          });
        }

        // Extract members
        node.members.forEach(member => {
          if (ts.isPropertySignature(member)) {
            interfaceInfo.members.push({
              type: 'property',
              name: member.name.text,
              optional: !!member.questionToken,
              typeSignature: member.type?.getText() || 'any',
            });
          } else if (ts.isMethodSignature(member)) {
            interfaceInfo.members.push({
              type: 'method',
              name: member.name.text,
              optional: !!member.questionToken,
              parameters:
                member.parameters?.map(param => ({
                  name: param.name.text,
                  type: param.type?.getText() || 'any',
                  optional: !!param.questionToken,
                })) || [],
              returnType: member.type?.getText() || 'void',
            });
          }
        });

        interfaces.push(interfaceInfo);
      }
    });

    return interfaces;
  }

  /**
   * Extract type aliases
   */
  extractTypes(declarationPath) {
    const sourceFile = this.parseDeclarationFile(declarationPath);
    const types = [];

    ts.forEachChild(sourceFile, node => {
      if (ts.isTypeAliasDeclaration(node) && this.hasExportModifier(node)) {
        types.push({
          name: node.name.text,
          definition: node.type.getText(),
          typeParameters:
            node.typeParameters?.map(param => param.name.text) || [],
        });
      }
    });

    return types;
  }

  /**
   * Extract function declarations
   */
  extractFunctions(declarationPath) {
    const sourceFile = this.parseDeclarationFile(declarationPath);
    const functions = [];

    ts.forEachChild(sourceFile, node => {
      if (ts.isFunctionDeclaration(node) && this.hasExportModifier(node)) {
        functions.push({
          name: node.name?.text || 'anonymous',
          parameters:
            node.parameters?.map(param => ({
              name: param.name.text,
              type: param.type?.getText() || 'any',
              optional: !!param.questionToken,
            })) || [],
          returnType: node.type?.getText() || 'void',
          typeParameters:
            node.typeParameters?.map(param => param.name.text) || [],
        });
      }
    });

    return functions;
  }

  /**
   * Extract class declarations
   */
  extractClasses(declarationPath) {
    const sourceFile = this.parseDeclarationFile(declarationPath);
    const classes = [];

    ts.forEachChild(sourceFile, node => {
      if (ts.isClassDeclaration(node) && this.hasExportModifier(node)) {
        const classInfo = {
          name: node.name?.text || 'anonymous',
          methods: [],
          properties: [],
          heritage: [],
        };

        // Extract heritage (extends/implements)
        if (node.heritageClauses) {
          node.heritageClauses.forEach(clause => {
            clause.types.forEach(type => {
              classInfo.heritage.push({
                kind:
                  clause.token === ts.SyntaxKind.ExtendsKeyword
                    ? 'extends'
                    : 'implements',
                name: type.expression.text,
              });
            });
          });
        }

        // Extract members
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name) {
            classInfo.methods.push({
              name: member.name.text,
              parameters:
                member.parameters?.map(param => ({
                  name: param.name.text,
                  type: param.type?.getText() || 'any',
                })) || [],
              returnType: member.type?.getText() || 'void',
              isStatic:
                member.modifiers?.some(
                  mod => mod.kind === ts.SyntaxKind.StaticKeyword
                ) || false,
            });
          } else if (ts.isPropertyDeclaration(member) && member.name) {
            classInfo.properties.push({
              name: member.name.text,
              type: member.type?.getText() || 'any',
              isStatic:
                member.modifiers?.some(
                  mod => mod.kind === ts.SyntaxKind.StaticKeyword
                ) || false,
            });
          }
        });

        classes.push(classInfo);
      }
    });

    return classes;
  }

  /**
   * Check if node has export modifier
   */
  hasExportModifier(node) {
    return (
      node.modifiers?.some(
        modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
      ) || false
    );
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose'),
  };

  const extractor = new APIExtractor(options);

  try {
    const api = extractor.extractAPI();
    console.log(JSON.stringify(api, null, 2));
  } catch (error) {
    console.error('API extraction failed:', error.message);
    process.exit(1);
  }
}

module.exports = APIExtractor;
