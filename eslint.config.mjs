// ESLint flat config for React + TypeScript
// Enforces: hooks correctness, and prevents using variables (from hooks) before declaration.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Ignore generated + build output
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "convex/_generated/**",
    ],
  },

  // Base JS + TS recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Project rules
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Hooks correctness
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Prevents referencing hook results before they are declared
      // (e.g. using a mutation variable inside a callback defined above it)
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "error",
        { functions: false, classes: true, variables: true },
      ],

      // Vite + React fast refresh helper
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
];
