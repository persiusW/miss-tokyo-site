import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next 2/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Non-app directories that should not be linted:
    ".claude/**",
    "tests/**",
    "playwright.config.ts",
  ]),
  // Project-level rule overrides.
  {
    rules: {
      // Downgrade from error to warning — pervasive in dashboard pages,
      // not a safety issue in typed Next.js/Supabase code.
      "@typescript-eslint/no-explicit-any": "warn",
      // React Compiler rule over-flags normal useEffect data-fetch patterns.
      "react-hooks/set-state-in-effect": "off",
      // img vs next/image — unoptimized is intentional (images.unoptimized: true).
      "@next/next/no-img-element": "warn",
      // Apostrophes/quotes in JSX text — cosmetic, not a runtime issue.
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
