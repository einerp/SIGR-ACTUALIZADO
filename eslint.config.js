const globals = require('globals');

const recommendedRules = {
  'no-constant-condition': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-unreachable': 'error',
  'no-undef': 'error',
  'no-unused-vars': 'off'
};

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'data/**', '.tmp/**', '.vercel/**']
  },
  {
    files: ['**/*.js'],
    ignores: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: globals.node
    },
    rules: recommendedRules
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        API: 'readonly',
        SIGR: 'readonly',
        bootstrap: 'readonly',
        Chart: 'readonly'
      }
    },
    rules: recommendedRules
  }
];
