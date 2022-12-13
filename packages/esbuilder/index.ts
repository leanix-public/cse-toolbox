#!/usr/bin/env node
import { Command } from 'commander'
import figlet from 'figlet'
import { build, BuildOptions } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { name, version } from './package.json'

export interface IEsBuilderOptions {
  entrypoint: string
  outdir?: string
}

console.log(figlet.textSync(name))

const program = new Command()

program
  .version(version)
  .description('An example CLI for managing a directory')
  .requiredOption('-e, --entrypoint <filepath>', 'Filepath for the entrypoint')
  .option('-o, --outdir <dirpath>', 'Output dir path', 'dist')
  .parse(process.argv)

const getOptions = (options: IEsBuilderOptions): BuildOptions => ({
  entryPoints: [options.entrypoint],
  format: 'cjs',
  minify: false,
  bundle: true,
  platform: 'node',
  target: 'es6',
  sourcemap: true,
  watch: false,
  outdir: options.outdir ?? 'dist',
  outbase: '.',
  loader: { '.ts': 'ts' },
  plugins: [nodeExternalsPlugin()]
})

const options = getOptions(program.opts<IEsBuilderOptions>())

build(options).then(() => {
  console.log('⚡ Done')
})
