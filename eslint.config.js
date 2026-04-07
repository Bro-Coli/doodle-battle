import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['client/src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['client/vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['server/src/**/*.ts', 'server/vitest.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['server/**/*.test.ts', 'server/tests/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
  },
  {
    files: ['shared/**/*.ts'],
    languageOptions: {
      globals: globals.es2021,
    },
  },
);
