export type TemplateType = 'basic' | 'api-integration' | 'data-processing';
export type Language = 'typescript' | 'javascript';

export interface CreateToolOptions {
  name: string;
  description?: string;
  template: TemplateType;
  language: Language;
  includeTests: boolean;
  includeDocker: boolean;
  initGit: boolean;
  installDeps: boolean;
}

export interface TemplateContext {
  toolName: string;
  toolNamePascalCase: string;
  toolNameKebabCase: string;
  description: string;
  language: Language;
  includeTests: boolean;
  includeDocker: boolean;
  packageName: string;
  year: number;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}