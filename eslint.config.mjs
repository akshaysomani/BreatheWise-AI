import babelParser from '@babel/eslint-parser';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'out/**',
      'coverage/**',
      'prisma/**',
      '*.config.*',
      'scripts/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: [
            '@babel/preset-typescript',
            ['@babel/preset-react', { runtime: 'automatic' }],
          ],
        },
      },
    },
    rules: {
      'no-unreachable': 'error',
      'no-constant-condition': 'warn',
      'no-debugger': 'error',
    },
  },
];
