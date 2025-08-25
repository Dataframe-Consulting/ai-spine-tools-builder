/**
 * Available template types for tool generation.
 * 
 * @public
 */
export type TemplateType = 'basic' | 'api-integration' | 'data-processing';

/**
 * Supported programming languages for tool generation.
 * 
 * @public
 */
export type Language = 'typescript' | 'javascript';

/**
 * Configuration options for creating a new AI Spine tool.
 * 
 * @public
 * @interface CreateToolOptions
 */
export interface CreateToolOptions {
  /** The name of the tool to create (must be a valid npm package name) */
  name: string;
  
  /** Optional description for the tool (defaults to "An AI Spine tool") */
  description?: string;
  
  /** Template type to use for tool generation */
  template: TemplateType;
  
  /** Programming language to use */
  language: Language;
  
  /** Whether to include test files and configuration */
  includeTests: boolean;
  
  /** Whether to include Docker configuration files */
  includeDocker: boolean;
  
  /** Whether to initialize a git repository */
  initGit: boolean;
  
  /** Whether to automatically install npm dependencies */
  installDeps: boolean;
}

/**
 * Template context used for variable substitution during tool generation.
 * 
 * @public
 * @interface TemplateContext
 */
export interface TemplateContext {
  /** Original tool name as provided by user */
  toolName: string;
  
  /** Tool name converted to PascalCase for class names */
  toolNamePascalCase: string;
  
  /** Tool name converted to kebab-case for file names */
  toolNameKebabCase: string;
  
  /** Tool description */
  description: string;
  
  /** Programming language used */
  language: Language;
  
  /** Whether tests are included */
  includeTests: boolean;
  
  /** Whether Docker configuration is included */
  includeDocker: boolean;
  
  /** Package name for package.json */
  packageName: string;
  
  /** Current year for copyright notices */
  year: number;
  
  /** Runtime dependencies to include in package.json */
  dependencies: Record<string, string>;
  
  /** Development dependencies to include in package.json */
  devDependencies: Record<string, string>;
}

/**
 * Configuration file structure for team-wide defaults.
 * 
 * @public
 * @interface TeamConfig
 */
export interface TeamConfig {
  /** Default template to use */
  defaultTemplate?: TemplateType;
  
  /** Default language to use */
  defaultLanguage?: Language;
  
  /** Default author name */
  author?: string;
  
  /** Default license */
  license?: string;
  
  /** Additional default dependencies */
  additionalDependencies?: Record<string, string>;
  
  /** Additional default dev dependencies */
  additionalDevDependencies?: Record<string, string>;
  
  /** Default git settings */
  git?: {
    /** Whether to initialize git by default */
    init: boolean;
    /** Default initial commit message */
    initialCommitMessage?: string;
  };
  
  /** Default Docker settings */
  docker?: {
    /** Whether to include Docker by default */
    include: boolean;
    /** Base Docker image to use */
    baseImage?: string;
  };
}

/**
 * System requirements and environment configuration.
 * 
 * @public
 * @interface SystemRequirements
 */
export interface SystemRequirements {
  /** Minimum Node.js version required */
  nodeVersion: string;
  
  /** Minimum npm version required */
  npmVersion: string;
  
  /** Available disk space required (in MB) */
  diskSpaceMb: number;
  
  /** Required system tools (git, etc.) */
  requiredTools: string[];
}

/**
 * Error information for CLI operations.
 * 
 * @public
 * @interface CliError
 */
export interface CliError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Suggested solutions for the error */
  suggestions?: string[];
  
  /** Whether the operation can be retried */
  retryable: boolean;
  
  /** Additional error details */
  details?: Record<string, any>;
}