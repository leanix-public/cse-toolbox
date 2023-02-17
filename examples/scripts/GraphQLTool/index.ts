#!/usr/bin/env node
import { Command } from 'commander'
import figlet from 'figlet'
import { writeFileSync } from 'node:fs'
import { version, description } from './package.json'

import { useLeanIX } from 'lx-core'

export interface ICliOptions {
  host: string
  apitoken: string
  query?: string
  output?: string
}

console.log(figlet.textSync('LeanIX GraphQL Tool'))

const program = new Command()

const DEFAULT_GRAPHQL_QUERY = '{allFactSheets{edges{node{id type name}}}}'
const DEFAULT_OUTPUT_PATH = 'data.json'

program
  .version(version)
  .description(description)
  .requiredOption(
    '-h, --host <your_leanix_api_host>',
    'LeanIX API host, e.g. "app.leanix.net"'
  )
  .requiredOption('-t, --apitoken <your_leanix_api_token>', 'LeanIX API token')
  .option(
    '-q, --query <your graphql query>',
    'The GraphQL query to be executed',
    DEFAULT_GRAPHQL_QUERY
  )
  .option(
    '-o, --output <json file path>',
    'The path for the output file',
    DEFAULT_OUTPUT_PATH
  )
  .parse(process.argv)

const {
  host,
  apitoken,
  query = DEFAULT_GRAPHQL_QUERY,
  output = DEFAULT_OUTPUT_PATH
} = program.opts<ICliOptions>()

const { authenticate, executeGraphQL } = useLeanIX({ host, apitoken })
;(async () => {
  await authenticate()
  writeFileSync(output, JSON.stringify(await executeGraphQL(query), null, 2))
  console.log(`Saved data to ${output}`)
})()
