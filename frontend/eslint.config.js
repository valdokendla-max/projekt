const nextConfig = require("eslint-config-next")

const config = [
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "node_modules/**",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...nextConfig,
  {
    rules: {
      // Lisa vajadusel reegleid
    },
  },
]

module.exports = config
