import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: ["dist/"],
    rules: {
      'no-undef': ['error', { 'typeof': false }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-process-env': 'off',
      'no-exports-assign': 'off',
      "indent": ["error", 2],
      "semi": ["error", "always"],
    }}
];