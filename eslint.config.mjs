import { FlatCompat } from "@eslint/eslintrc"

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

// Lint is real here: it covers every .ts/.tsx in the repo and CI fails on
// warnings. The legacy repos shipped an eslint config that ignored all
// TypeScript files (HANDOFF §5 bug 11) — do not reintroduce that.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "apps-script/**", "next-env.d.ts"],
  },
  {
    rules: {
      // Leading underscore = intentionally discarded (e.g. stripping `gate`
      // from the public config).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
]

export default eslintConfig
