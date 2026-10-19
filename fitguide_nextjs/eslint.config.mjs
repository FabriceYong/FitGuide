import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...nextVitals,
  {
    // Legacy JavaScript from before the TypeScript move. These React Compiler
    // rules flag patterns that work today (functions used in effects before
    // their declaration, setState in effects); they warn here and stay errors
    // in TypeScript files, so new code is held to them.
    files: ['src/**/*.js'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'],
  },
];
