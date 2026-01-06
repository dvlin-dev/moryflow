import baseConfig from '@aiget/eslint-config/base';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  ...baseConfig,
  {
    plugins: {
      'react-refresh': reactRefresh,
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
