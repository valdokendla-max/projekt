const nextConfig = require("eslint-config-next")

const config = [
  {
    ignores: [
      ".next/**",
      ".netlify/**",
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
