import { createRequire } from 'node:module';

// Reuse the repository's existing frontend lint tooling without new dependencies.
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const tseslint = require('typescript-eslint');

export default [
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none',
      }],
    },
  },
];
