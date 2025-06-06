import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
const externalPackages = ['bcrypt', 'node-gyp-build'];

export default {
  input: 'dist/linker/index.js',

  output: {
    file: 'dist/bundle.cjs',
    format: 'cjs',
    banner: '#!/usr/bin/env node',
    inlineDynamicImports: true,
  },

  plugins: [
    resolve({
      preferBuiltins: true,
    }),
    commonjs({
      exclude: externalPackages.map((pkg) => `node_modules/${pkg}/**`),
    }),
    json(),
  ],

  external: (id) => {
    return externalPackages.some((pkg) => id === pkg || id.startsWith(pkg + '/'));
  },
};
