import baseConfig from '@aiget/eslint-config/base';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...baseConfig,
  {
    plugins: {
      'react-refresh': reactRefresh,
      'react-hooks': reactHooks,
    },
  },
  {
    files: ['apps/moryflow/mobile/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
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
