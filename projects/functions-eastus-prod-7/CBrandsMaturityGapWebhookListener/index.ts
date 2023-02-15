import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import {
  useLeanIX,
  UnauthenticatedError,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  NetworkConnectivityError
} from 'lx-core'

export interface IWebhookPayload {
  id: number
  transactionSequenceNumber: number
  type: string
  createdAt: string
  userId: string
  workspaceId: string
  factSheet: {
    id: string
    type: string
  }
}

const { authenticate, accessToken, executeGraphQL } = useLeanIX({
  // Local development: environment variables defined in local.settings.json
  host: process.env.LXR_HOST as string,
  apitoken: process.env.LXR_APITOKEN as string
})

// Expected maturity values, this must match the data model definition for both
// targetMaturity and currentMaturity single select fields
const MATURITY_VALUES = [
  'adhoc',
  'repeatable',
  'defined',
  'managed',
  'optimized'
]

const MATURITY_GAP_VALUES = ['aligned', 'low', 'medium', 'large', 'max']

// Method for computing the maturityGap from the difference between the targetMaturity and currentMaturity fields
const computeMaturityGap = (
  targetMaturity: string | null,
  currentMaturity: string | null
) => {
  const currentMaturityValue =
    currentMaturity === null ? null : MATURITY_VALUES.indexOf(currentMaturity)
  const targetMaturityValue =
    targetMaturity === null ? null : MATURITY_VALUES.indexOf(targetMaturity)
  const maturityGap =
    currentMaturity === null || targetMaturity === null
      ? null
      : MATURITY_GAP_VALUES[
          Math.abs(
            (currentMaturityValue as number) - (targetMaturityValue as number)
          )
        ]
  return maturityGap
}

const refreshAllBusinessCapabilities = async () => {
  // If we are not authenticated yet, lets get an accessToken
  if (accessToken.expiresIn === -1) await authenticate()
  const query =
    '{allFactSheets(factSheetType: BusinessCapability){edges{node{...on BusinessCapability{id type targetMaturity currentMaturity maturityGap}}}}}'
  const businessCapabilities = await executeGraphQL<{
    allFactSheets: { edges: any }
  }>(query).then(
    (res) => res?.data?.allFactSheets?.edges?.map(({ node }) => node) ?? []
  )
  const factSheetsToUpdate = businessCapabilities.reduce(
    (accumulator, factSheet) => {
      const { maturityGap, targetMaturity, currentMaturity } = factSheet
      const _maturityGap = computeMaturityGap(targetMaturity, currentMaturity)
      if (_maturityGap !== maturityGap)
        accumulator.push({ ...factSheet, maturityGap: _maturityGap })
      return accumulator
    },
    []
  )
  if (factSheetsToUpdate.length === 0)
    console.log('All Business Capability maturityGaps are up to date...')
  for (const { id, maturityGap } of factSheetsToUpdate) {
    console.log(`Updating BC ${id} - ${maturityGap}`)
    await updateBusinessCapabilityMaturityGap({ id, maturityGap })
  }
}

// GraphQL query for fetching the maturity fields for a Business Capability
const fetchBusinessCapabilityMaturyFields = async (params: {
  id: string
  context: Context
}) => {
  const res = await executeGraphQL<{
    factSheet: {
      id: string
      type: string
      name: string
      targetMaturity: string | null
      currentMaturity: string | null
      maturityGap: string | null
    }
  }>(
    'query ($id:ID!) {factSheet(id: $id) {id type name ...on BusinessCapability { targetMaturity currentMaturity maturityGap } } }',
    { id: params.id }
  )
  if ((res?.errors ?? null) !== null) {
    params.context.res = {
      status: 500,
      contentType: 'application/json',
      body: res
    }
    return null
  }
  const factSheet = res.data?.factSheet ?? null
  return factSheet
}

// GraphQL mutation for updating a businessCapability's maturityGap
const updateBusinessCapabilityMaturityGap = async (params: {
  context?: Context
  id: string
  maturityGap: string | null
}) => {
  const query =
    'mutation($id:ID!,$patches:[Patch]!){updateFactSheet(id:$id,patches:$patches,validateOnly:false){factSheet{...on BusinessCapability{id type maturityGap}}}}'
  const variables = {
    id: params.id,
    patches: [
      { op: 'replace', path: '/maturityGap', value: params.maturityGap }
    ]
  }
  const res = await executeGraphQL(query, variables)
  if ((res?.errors ?? null) !== null) {
    console.error(JSON.stringify(res))
    if (params.context !== undefined)
      params.context.res = {
        status: 500,
        contentType: 'application/json',
        body: res
      }
  }
  console.log(
    `Updated Business Capability ${params.id} maturityGap to ${params.maturityGap}`
  )
}

// Here we just process the webhook payload and implement the algorithm for computing the maturityGap field
const requestHandler = async (context: Context, req: HttpRequest) => {
  if (req.method !== 'POST' || (req?.body ?? null) === null) {
    context.res = {
      status: 500,
      contentType: 'application/json',
      body: { error: 'invalid request' }
    }
    return
  }
  const body = req.body as IWebhookPayload
  if (
    body.type !== 'FactSheetUpdatedEvent' ||
    body?.factSheet?.type !== 'BusinessCapability'
  )
    return
  const factSheet = await fetchBusinessCapabilityMaturyFields({
    context,
    id: body.factSheet.id
  })
  if (context?.res?.status === 500 || factSheet === null) return

  const { maturityGap, currentMaturity, targetMaturity } = factSheet
  const _maturityGap = computeMaturityGap(targetMaturity, currentMaturity)

  if (_maturityGap !== maturityGap) {
    await updateBusinessCapabilityMaturityGap({
      context,
      id: factSheet.id,
      maturityGap: _maturityGap
    })
  }
}

// Here we handle all the authorization process (i.e. algorithm for getting an auth token during the azure function operation)
const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log('HTTP trigger function processed a request.')
  try {
    // If we are not authenticated yet, lets get an accessToken
    if (accessToken.expiresIn === -1) await authenticate()
    // If we have an accessToken, lets process the request
    await requestHandler(context, req)
  } catch (error) {
    // If we got one of these errors, our credentials are not ok, please check if they are still
    // valid in the workspace
    if (
      error instanceof InvalidLeanIXApiTokenError ||
      error instanceof InvalidLeanIXHostError
    ) {
      console.error(`Invalid credentials: ${error.message}`)
      context.res = {
        status: 401,
        contentType: 'application/json',
        body: { error: 'unauthorized' }
      }
      // Getting this error means that we could not reach our workspace host
    } else if (error instanceof NetworkConnectivityError) {
      console.error(error)
      context.res = {
        status: 500,
        contentType: 'application/json',
        body: { error: 'something went wrong, please try again later' }
      }
      // Here we got a 401 from the backend,
      // Just in case of an expired accessToken fetched earlier, we will repeat the authorization process
      // once for getting a fresh accessToken
    } else if (error instanceof UnauthenticatedError) {
      try {
        await authenticate()
        await requestHandler(context, req)
        // If we still got a UnauthenticatedError, we'll inform the user
      } catch (error) {
        if (error instanceof UnauthenticatedError) {
          context.res = {
            status: 401,
            contentType: 'application/json',
            body: { error: 'unauthorized' }
          }
        } else throw error
      }
    } else throw error
  }
}

// we call this method when the azure function launches for the first time
refreshAllBusinessCapabilities()

export default httpTrigger
