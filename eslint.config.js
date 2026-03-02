import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['{src,tests}/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strict],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'no-console': 'off',
    },
  },
  {
    ignores: ['.output/', '.wxt/', 'node_modules/', 'dist/'],
  },
);
