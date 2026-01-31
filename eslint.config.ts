import vue from 'eslint-plugin-vue';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        sourceType: 'module',
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-console': 'warn',
      eqeqeq: ['error', 'always'],

      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      quotes: ['warn', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      indent: ['error', 2, { SwitchCase: 1 }],
    },
  },
];
