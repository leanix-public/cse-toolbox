import type { JestConfigWithTsJest } from 'ts-jest'
import baseConfig from '../../jest.config'
import merge from 'deepmerge'

// any additional jest configuration for this package goes here
const config: JestConfigWithTsJest = {
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
}

export default merge.all([baseConfig, config])
