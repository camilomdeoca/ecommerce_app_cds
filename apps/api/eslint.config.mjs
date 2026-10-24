// @ts-check
import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  globalIgnores([
    "coverage/**",
    "eslint.config.mjs",
    "prisma.config.ts",
    "dist",
    "src/prisma/contract.d.ts",
    "migrations",
    // Bundled study files, not source: the code study is plain lab.js.
    "templates/**/files/**",
    ".agents",
    ".claude",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
]);
