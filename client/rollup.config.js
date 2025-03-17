import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'

export default {
  input: 'dist/index.mjs',
  output: [
      { file: 'dist/bundle.mjs', format: 'es' },
      { file: 'dist/bundle.min.mjs', format: 'es', plugins: [terser()], sourcemap: true },
      { file: 'dist/bundle.umd.js', format: 'umd', name: 'SharedState' },
      { file: 'dist/bundle.umd.min.js', format: 'umd', name: 'SharedState', plugins: [terser()], sourcemap: true }
  ],
  plugins: [ commonjs() ]
};