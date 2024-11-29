import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-undef': ['error', { 'typeof': false }],
      '@typescript-eslint/no-require-imports': 'off',
      'no-process-env': 'off',
      'no-exports-assign': 'off',
      "indent": ["error", 2],
      "semi": ["error", "always"],
    }}
];