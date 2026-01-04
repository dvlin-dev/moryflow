import baseConfig from '@aiget/eslint-config/base';

export default [
  ...baseConfig,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', 'pnpm-lock.yaml'],
  },
];
