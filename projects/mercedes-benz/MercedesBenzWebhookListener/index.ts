import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import {
  UnauthenticatedError,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  NetworkConnectivityError
} from 'lx-core'
import { IWebhookPayload, QueueTask } from '../common/types'
import NodeCache from 'node-cache'
import { promise as Fastq } from 'fastq'
import { accessToken, authenticate, queuedTask } from '../common'

const queue = Fastq<any, QueueTask, void>(queuedTask, 1)
const cache = new NodeCache({ stdTTL: 120, deleteOnExpire: true })

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
  queue.push({ applicationId: body.factSheet.id })
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
