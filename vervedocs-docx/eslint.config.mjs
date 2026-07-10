import js from '@eslint/js'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  {
    ignores: ['node_modules', 'dist', 'site', 'index.html', 'src/assets/iconfont/*.js', 'scripts']
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        process: 'readonly',
        __APP_VERSION__: 'readonly',
        RequestInit: 'readonly',
        RequestMode: 'readonly',
        RequestCredentials: 'readonly',
        TextEncoder: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        debugger: 'readonly',
        fetch: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': ts,
      'unused-imports': unusedImports
    },
    rules: {
      'linebreak-style': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-constant-condition': ['error', {
        checkLoops: false
      }],
      'semi': [1, 'never'],
      'quotes': [1, 'single', {
        allowTemplateLiterals: true
      }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_'
      }]
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        process: 'readonly',
        __APP_VERSION__: 'readonly',
        RequestInit: 'readonly',
        RequestMode: 'readonly',
        RequestCredentials: 'readonly',
        TextEncoder: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        debugger: 'readonly',
        fetch: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': ts,
      'unused-imports': unusedImports
    },
    rules: {
      'linebreak-style': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-constant-condition': ['error', {
        checkLoops: false
      }],
      'semi': [1, 'never'],
      'quotes': [1, 'single', {
        allowTemplateLiterals: true
      }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_'
      }]
    }
  }
]
