import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import {
  useLeanIX,
  UnauthenticatedError,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  NetworkConnectivityError
} from 'lx-core'
import { IWebhookPayload } from './types'
import NodeCache from 'node-cache'
import { promise as Fastq } from 'fastq'

interface Task {
  factSheetId: string
}

type TApplicationOperationalStatus = 'operational' | 'deprecated'

interface IApplicationFields {
  id: string
  name: string
  lifecycle: null | string
  rev: number
  mbgAppOperationalStatus: null | TApplicationOperationalStatus
}

// GraphQL query for fetching the maturity fields for a Business Capability
const fetchApplicationFields = async (
  factSheetId: string
): Promise<IApplicationFields | null> => {
  const res = await executeGraphQL<{
    factSheet: {
      id: string
      type: string
      name: string
      rev: number
      lifecycle: null | {
        asString: string
      }
      mbgAppOperationalStatus: TApplicationOperationalStatus | null
    }
  }>(
    'query ($factSheetId: ID!) { factSheet(id: $factSheetId) { id type ...on Application { rev name lifecycle { asString } mbgAppOperationalStatus } } }',
    { factSheetId }
  )
  if ((res?.errors ?? null) !== null) {
    console.error(res.errors)
    return null
  }
  const factSheet = res.data?.factSheet ?? null
  if (factSheet === null) return null
  const { id, name, lifecycle, mbgAppOperationalStatus, rev } = factSheet
  const applicationFields: IApplicationFields = {
    id,
    name,
    rev,
    lifecycle: lifecycle?.asString ?? null,
    mbgAppOperationalStatus
  }
  return applicationFields
}

const mutateApplicationStatus = async (
  factSheetId: string,
  rev: number,
  mbgAppOperationalStatus: TApplicationOperationalStatus | null
) => {
  const query = `
    mutation ($factSheetId:ID!, $rev:Long, $patches: [Patch]!){
    updateFactSheet(id:$factSheetId, rev:$rev, patches:$patches){
      factSheet {
        id
      }
    }
  }`
  const variables = {
    factSheetId,
    rev,
    patches: [
      {
        op: 'replace',
        path: '/mbgAppOperationalStatus',
        value: mbgAppOperationalStatus
      }
    ]
  }
  const { errors } = await executeGraphQL(query, variables)
  if (Array.isArray(errors)) {
    console.log(`Error while updating Application ${factSheetId}`, errors)
  }
}

const getExpectedStatus = (lifecycle: string | null) => {
  let status: TApplicationOperationalStatus | null = null
  switch (lifecycle) {
    case null:
    case '-':
      status = null
      break
    case 'endOfLife':
      status = 'deprecated'
      break
    default:
      status = 'operational'
      break
  }
  return status
}

const worker = async (task: Task) => {
  let applicationFields: IApplicationFields | null = null
  try {
    applicationFields = await fetchApplicationFields(task.factSheetId)
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      await authenticate()
      applicationFields = await fetchApplicationFields(task.factSheetId)
    } else throw err
  }
  if (applicationFields === null) {
    console.error(`Could not fetch fields for application: ${task.factSheetId}`)
    return
  }
  const { lifecycle, mbgAppOperationalStatus, name, rev } = applicationFields
  const expectedStatus = getExpectedStatus(lifecycle)
  if (mbgAppOperationalStatus !== expectedStatus) {
    await mutateApplicationStatus(task.factSheetId, rev, expectedStatus)
    console.log(`SET: ${name} => ${expectedStatus}`)
  }
}

const queue = Fastq<any, Task, void>(worker, 1)
const cache = new NodeCache({ stdTTL: 120, deleteOnExpire: true })

const { authenticate, accessToken, executeGraphQL } = useLeanIX({
  // Local development: environment variables defined in local.settings.json
  host: process.env.LXR_HOST as string,
  apitoken: process.env.LXR_APITOKEN as string
})

// This will be sent if we get an invalid request
const getInvalidResponse = () => ({
  status: 400,
  contentType: 'application/json',
  body: { error: 'invalid request' }
})

const requestHandler = async (context: Context, req: HttpRequest) => {
  if (req.method !== 'POST' || (req?.body ?? null) === null) {
    context.res = getInvalidResponse()
    return
  }
  const body = req.body as IWebhookPayload
  if (
    body.type !== 'FactSheetUpdatedEvent' ||
    body?.factSheet?.type !== 'Application'
  )
    return {
      status: 400,
      contentType: 'application/json',
      body: {
        error:
          'not a "FactSheetUpdatedEvent" or an "Application" factsheet type'
      }
    }
  // since the webhook events are not guaranteed to be delivered in order, we use the
  // cache to ensure that we don't process a previous request after a more recent one
  const lastTransactionSequenceNumberForFactSheet =
    cache.get<number>(body.factSheet.id) ?? -1
  // if we get an out-of-sequence request for a certain factsheet id return a 204 status and discard
  // it silently
  if (
    lastTransactionSequenceNumberForFactSheet > body.transactionSequenceNumber
  ) {
    context.res = { status: 204 }
    return
  }
  cache.set(body.factSheet.id, body.transactionSequenceNumber)
  queue.push({ factSheetId: body.factSheet.id })
  context.res = { status: 200 }
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

export default httpTrigger
