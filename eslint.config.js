import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
    js.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 2022,
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'one-var': ['error', 'never'],
            'one-var-declaration-per-line': ['error', 'always'],
            semi: ['error', 'always'],
        },
    },
];
