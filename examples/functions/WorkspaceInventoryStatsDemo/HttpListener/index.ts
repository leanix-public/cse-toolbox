import { AzureFunction, Context } from '@azure/functions'
import {
  useLeanIX,
  UnauthenticatedError,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  NetworkConnectivityError
} from 'lx-core'

const { authenticate, executeGraphQL, accessToken } = useLeanIX({
  // Local development: environment variables defined in local.settings.json
  host: process.env.LXR_HOST as string,
  apitoken: process.env.LXR_APITOKEN as string
})

const requestHandler = async (context: Context) => {
  const res = await executeGraphQL('{allFactSheets{edges{node{id type name}}}}')
  context.res = {
    // status: 200, /* Defaults to 200 */
    contentType: 'application/json',
    body: res
  };
}

const httpTrigger: AzureFunction = async function (
  context: Context
): Promise<void> {
  context.log('HTTP trigger function processed a request.')
  try {
    // If we are not authenticated yet, lets get an accessToken
    if (accessToken.expiresIn === -1) await authenticate()
    // If we have an accessToken, lets process the request
    await requestHandler(context)
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
        await requestHandler(context)
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
