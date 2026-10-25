module.exports = {
  extends: ['./config/eslint', 'plugin:json/recommended'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: { tsconfigRootDir: __dirname },
  globals: {
    runtime: 'readonly',
    _: 'readonly',
    server: 'readonly',
    config: 'readonly',
    describe: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    atob: 'readonly',
    btoa: 'readonly',
  },
};
