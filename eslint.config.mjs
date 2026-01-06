import baseConfig from '@aiget/eslint-config/base';

export default [
  ...baseConfig,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'pnpm-lock.yaml',
      '**/generated/**',
      'apps/aiget/fetchx/server/test/**',
      'apps/aiget/fetchx/server/src/**/__tests__/**',
    ],
  },
];
