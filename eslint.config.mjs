import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/.output/**",
    "**/.nitro/**",
    "**/.tanstack/**",
    "**/.turbo/**",
    "apps/web/src/routeTree.gen.ts",
    "apps/qr-menu/src/routeTree.gen.ts",
    // Design references (DesainPakeAI export and the older HTML prototype)
    // and local scratch files are not app code.
    "design/**",
    "desainpakeai/**",
    ".data/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "apps/qr-menu/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
]);
