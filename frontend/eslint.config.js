const { FlatCompat } = require("@eslint/eslintrc")
const path = require("path")

const compat = new FlatCompat({ baseDirectory: __dirname })

const config = [
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "node_modules/**",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
]

module.exports = config
