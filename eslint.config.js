import js from "@eslint/js";
import globals from "globals";

export default [
  // 1. Global recommended rules for all files
  js.configs.recommended,

  // 2. Browser environment for all client-side code
module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
    es6: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: [
    'import',
    'prettier'
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-cycle': 'off',
    'import/no-mutable-exports': 'off',
    'import/no-import-module-exports': 'off',
    'no-undef': 'off',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    'arrow-body-style': 'error',
    'no-useless-constructor': 'error',
    'no-dupe-class-members': 'error',
    'no-duplicate-imports': 'error',
    'no-restricted-syntax': [
      'error',
      'WithStatement'
    ]
  }
};
