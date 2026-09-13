import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'src/generated/**', '.claude/**', 'next-env.d.ts', 'scripts/**'],
  },
  ...nextVitals,
  ...nextTs,
];

export default config;
