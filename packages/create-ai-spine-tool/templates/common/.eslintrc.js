/**
 * ESLint configuration for {{toolNamePascalCase}} - {{description}}
 * 
 * This configuration enforces code quality standards and best practices
 * for AI Spine tools development. It includes TypeScript support, security
 * rules, and performance optimizations.
 * 
 * Generated on {{date}} using create-ai-spine-tool v1.0.0
 * Template: {{template}}, Language: {{language}}
 */

module.exports = {
  parser: '{{#isTypeScript}}@typescript-eslint/parser{{/isTypeScript}}{{#isJavaScript}}@babel/eslint-parser{{/isJavaScript}}',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    {{#isTypeScript}}
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    {{/isTypeScript}}
    {{#isJavaScript}}
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-env']
    }
    {{/isJavaScript}}
  },
  env: {
    node: true,
    es2022: true,
    {{#includeTests}}jest: true,{{/includeTests}}
  },
  extends: [
    'eslint:recommended',
    {{#isTypeScript}}
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    {{/isTypeScript}}
    {{#isJavaScript}}
    'standard',
    {{/isJavaScript}}
    'plugin:security/recommended',
    'plugin:import/recommended',
    {{#isTypeScript}}'plugin:import/typescript',{{/isTypeScript}}
    'plugin:node/recommended',
    {{#includeTests}}'plugin:jest/recommended',{{/includeTests}}
  ],
  plugins: [
    {{#isTypeScript}}'@typescript-eslint',{{/isTypeScript}}
    'security',
    'import',
    'node',
    {{#includeTests}}'jest',{{/includeTests}}
    'promise',
    'unicorn'
  ],
  rules: {
    // General JavaScript/TypeScript rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': 'off', // Handled by TypeScript
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    
    {{#isTypeScript}}
    // TypeScript-specific rules
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    {{/isTypeScript}}
    
    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    
    // Import rules
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': { 'order': 'asc' }
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-unused-modules': 'warn',
    'import/no-deprecated': 'warn',
    
    // Node.js rules
    'node/no-unpublished-import': 'off', // Allow dev dependencies
    'node/no-missing-import': 'off', // Handled by import plugin
    {{#isTypeScript}}'node/no-unsupported-features/es-syntax': 'off', // TypeScript handles this{{/isTypeScript}}
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-promises/fs': 'error',
    'node/prefer-promises/dns': 'error',
    
    // Promise rules
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/avoid-new': 'warn',
    
    // Unicorn rules (additional best practices)
    'unicorn/better-regex': 'error',
    'unicorn/catch-error-name': 'error',
    'unicorn/consistent-destructuring': 'error',
    'unicorn/custom-error-definition': 'error',
    'unicorn/error-message': 'error',
    'unicorn/escape-case': 'error',
    'unicorn/expiring-todo-comments': 'warn',
    'unicorn/explicit-length-check': 'error',
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'unicorn/new-for-builtins': 'error',
    'unicorn/no-array-instanceof': 'error',
    'unicorn/no-console-spaces': 'error',
    'unicorn/no-hex-escape': 'error',
    'unicorn/no-new-buffer': 'error',
    'unicorn/no-unsafe-regex': 'error',
    'unicorn/number-literal-case': 'error',
    'unicorn/prefer-includes': 'error',
    'unicorn/prefer-starts-ends-with': 'error',
    'unicorn/prefer-text-content': 'error',
    'unicorn/prefer-type-error': 'error',
    'unicorn/throw-new-error': 'error',
    
    {{#includeTests}}
    // Jest rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    {{/includeTests}}
  },
  settings: {
    {{#isTypeScript}}
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    },
    {{/isTypeScript}}
    node: {
      tryExtensions: ['.js', '.ts', '.json', '.node']
    }
  },
  overrides: [
    {{#includeTests}}
    // Test files have relaxed rules
    {
      files: ['**/__tests__/**/*', '**/*.{test,spec}.{js,ts}'],
      rules: {
        'no-console': 'off',
        'security/detect-object-injection': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        {{#isTypeScript}}
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        {{/isTypeScript}}
      }
    },
    {{/includeTests}}
    {{#isTypeScript}}
    // Declaration files have different rules
    {
      files: ['**/*.d.ts'],
      rules: {
        'import/no-unused-modules': 'off',
        'unicorn/filename-case': 'off'
      }
    },
    {{/isTypeScript}}
    // Configuration files have relaxed rules
    {
      files: ['*.config.js', '*.config.ts', '.eslintrc.js'],
      rules: {
        'unicorn/filename-case': 'off',
        'node/no-unpublished-require': 'off',
        {{#isTypeScript}}'@typescript-eslint/no-var-requires': 'off'{{/isTypeScript}}
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    'coverage/',
    '*.min.js',
    '*.bundle.js'
  ]
};