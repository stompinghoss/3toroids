module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb', 'plugin:security/recommended'],
  settings: {
    // eslint-disable-next-line quote-props
    'react': {
      version: '999.999.999', // Override with a dummy version
    },
  },
  plugins: ['security','compat'],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        '.eslintrc.{js,cjs}',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'import/extensions': ['error', 'always'],
    'security/detect-buffer-noassert': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-object-injection': 'error',
    'security/detect-unsafe-regex': 'error',
    'compat/compat': 'error',
  },
};
