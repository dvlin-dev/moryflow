import baseConfig from '@moryflow/eslint-config/base';
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
    files: ['apps/moryflow/pc/src/main/chat/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              message:
                'chat application modules must stay Electron-free; adapt event senders in ipc/.',
            },
          ],
          patterns: [
            {
              group: ['../ipc/*', '../ipc/**'],
              message: 'chat application modules must not import ipc modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'apps/moryflow/pc/src/main/chat/services/**/*.ts',
      'apps/moryflow/pc/src/main/chat/messages/**/*.ts',
      'apps/moryflow/pc/src/main/chat/stream/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../ipc/*', '../ipc/**'],
              message: 'non-IPC chat modules must not import ipc modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'apps/moryflow/pc/src/main/agent-runtime/runtime/**/*.ts',
      'apps/moryflow/pc/src/main/agent-runtime/memory/**/*.ts',
      'apps/moryflow/pc/src/main/agent-runtime/permission/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              message:
                'agent-runtime internals must stay Electron-free; inject host capabilities instead.',
            },
          ],
          patterns: [
            {
              group: [
                '../index',
                '../index.js',
                '../../agent-runtime/index',
                '../../agent-runtime/index.js',
              ],
              message: 'agent-runtime internals must not depend on the root export surface.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/.tanstack/**',
      '**/routeTree.gen.*',
      'pnpm-lock.yaml',
      '**/generated/**',
      'apps/anyhunt/server/test/**',
      'apps/anyhunt/server/src/**/__tests__/**',
    ],
  },
];
