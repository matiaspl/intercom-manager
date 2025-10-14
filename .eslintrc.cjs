module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended",
    "airbnb",
    "airbnb-typescript",
    "airbnb/hooks",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "vite.config.ts"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: ["./tsconfig.json"],
  },
  plugins: ["react-refresh"],
  settings: {
    react: {
      version: "detect",
    },
    propWrapperFunctions: [],
    linkComponents: [],
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "import/extensions": "off",
    "import/prefer-default-export": "off",
    // Temporarily off to keep lint zero-warning; re-enable later if desired
    "react-hooks/exhaustive-deps": "off",
    "react/require-default-props": "off",
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      },
    ],
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "no-console": "off",
    // Relaxations to accommodate mobile overlay integration
    "@typescript-eslint/no-explicit-any": "off",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-nested-ternary": "off",
    "consistent-return": "off",
    "no-await-in-loop": "off",
    "no-restricted-syntax": "off",
    "react/no-unstable-nested-components": "off",
    "no-void": "off",
    // Allow dev deps in tests and setup files
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["**/*.test.ts", "**/*.test.tsx", "src/test/**"],
      },
    ],
  },
};
