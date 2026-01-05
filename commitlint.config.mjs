import conventional from '@commitlint/config-conventional';

export default {
  ...conventional,
  rules: {
    ...conventional.rules,
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'revert',
        'build',
        'ci',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [0],
    'header-max-length': [2, 'always', 200],
  },
};
