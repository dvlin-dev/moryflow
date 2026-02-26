export const LOG_CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  auth: { label: '认证', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  ai: {
    label: 'AI',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  payment: {
    label: '支付',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  admin: {
    label: '管理',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  vault: {
    label: '知识库',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  },
  storage: {
    label: '存储',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  },
  sync: {
    label: '同步',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  },
};

export const LOG_LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  info: { label: 'INFO', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  warn: {
    label: 'WARN',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  error: { label: 'ERROR', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};
