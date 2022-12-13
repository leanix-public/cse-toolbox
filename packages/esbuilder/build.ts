import { build, BuildOptions } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'

const getOptions = (): BuildOptions => ({
  entryPoints: ['./index.ts'],
  format: 'cjs',
  minify: false,
  bundle: true,
  platform: 'node',
  target: 'es6',
  sourcemap: false,
  watch: false,
  outdir: 'dist',
  outbase: '.',
  loader: { '.ts': 'ts' },
  plugins: [nodeExternalsPlugin()]
})

void (async () => {
  const options = getOptions()
  await build(options)
  console.log('⚡ Done')
})()
