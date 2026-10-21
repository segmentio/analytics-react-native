const reactNative = require('@react-native/eslint-config/flat');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/coverage/',
      '**/lib/',
      '**/e2e/',
      '**/e2e-cli/',
      'examples/**',
      '**/*.config.js',
      '**/*.config.base.js',
      '**/constants-generator.js',
      '.prettierrc.js',
    ],
  },
  ...reactNative,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { project: ['./tsconfig.linter.json'] },
    },
    rules: {
      'no-void': ['error', { allowAsStatement: true }],
      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        {
          allowNumber: true,
          allowBoolean: true,
          allowAny: true,
          allowNullish: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { caughtErrors: 'none' }],
    },
  },
  {
    files: ['**/*.e2e.js'],
    languageOptions: { globals: { jest: 'readonly' } },
  },
  {
    files: ['**/__tests__/**', '**/__mocks__/**', '**/__helpers__/**'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { caughtErrors: 'none', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  }
);
