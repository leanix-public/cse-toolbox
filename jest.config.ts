import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
  verbose: true,
  setupFiles: ['dotenv/config'],
  // https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
  preset: 'ts-jest/presets/default-esm'
}

export default config
