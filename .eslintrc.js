module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:unicorn/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'unicorn'],
  rules: {
    'unicorn/no-process-exit': 0,
    // We are currently using commonjs. If / when it becomes viable for us to
    // switch to ESModules, we should consider enabling this rule
    'unicorn/prefer-module': 0,
  },
}
