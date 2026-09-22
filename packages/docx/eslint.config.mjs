import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import unusedImports from 'eslint-plugin-unused-imports'

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url))

export default [
  {
    ignores: ['node_modules', 'dist', 'site', 'scripts', 'src/auto-imports.d.ts', 'src/components.d.ts']
  },
  js.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
      },
    },
  },
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
        structuredClone: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        debugger: 'readonly',
        fetch: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        ImageData: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        MutationObserver: 'readonly',
        AbortController: 'readonly',
        TextDecoder: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        Location: 'readonly',
        URLSearchParams: 'readonly'
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
      'no-unused-vars': 'off',
      'no-constant-condition': ['error', {
        checkLoops: false
      }],
      'semi': [1, 'never'],
      'quotes': [1, 'single', {
        allowTemplateLiterals: true
      }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off'
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
        structuredClone: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        debugger: 'readonly',
        fetch: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        ImageData: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        MutationObserver: 'readonly',
        AbortController: 'readonly',
        TextDecoder: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        Location: 'readonly',
        URLSearchParams: 'readonly'
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
      'no-unused-vars': 'off',
      'no-constant-condition': ['error', {
        checkLoops: false
      }],
      'semi': [1, 'never'],
      'quotes': [1, 'single', {
        allowTemplateLiterals: true
      }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off'
    }
  }
]
