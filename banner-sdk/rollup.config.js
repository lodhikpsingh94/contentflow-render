import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/sdk.js',
      format: 'umd', // Universal format (works in browser & node)
      name: 'BannerSDKLibrary', // Internal name for the bundle
      exports: 'named', // Fixes the "Mixing named and default exports" warning
      sourcemap: true
    },
    {
      file: 'dist/sdk.min.js',
      format: 'umd',
      name: 'BannerSDKLibrary',
      exports: 'named',
      plugins: [terser()], // Minified version
      sourcemap: true
    }
  ],
  plugins: [
    resolve(), // Resolves node_modules
    commonjs() // Converts CommonJS modules to ES6
  ]
};