import {
  getAccessToken,
  decodeJwtClaims,
  getDefaultAccessToken,
  getDefaultJwtClaims,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  InvalidTokenError,
  UnauthenticatedError
} from '../helpers/auth'

import {
  ILeanIXCredentials,
  IAccessToken,
  IExecuteGraphQLParams,
  IJwtClaims,
  IGraphQLResponse,
  IAuthenticateState
} from './useLeanIX.d'

export { getDefaultAccessToken, getDefaultJwtClaims }
export type { ILeanIXCredentials, IGraphQLResponse }
export {
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  InvalidTokenError,
  UnauthenticatedError
}

const authenticate = async (
  credentials: ILeanIXCredentials,
  accessToken: IAccessToken,
  jwtClaims: IJwtClaims,
  state: IAuthenticateState
): Promise<void> => {
  if (state.authenticating) {
    // wait for the previous authentication to finalize, and recursively call method again
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
    return authenticate(credentials, accessToken, jwtClaims, state)
  }
  state.authenticating = true
  try {
    Object.assign(accessToken, await getAccessToken(credentials))
    Object.assign(jwtClaims, await decodeJwtClaims(accessToken))
    state.authenticationCount++
  } finally {
    state.authenticating = false
  }
}

export const executeGraphQL = async <T>(
  params: IExecuteGraphQLParams & { accessToken: IAccessToken }
): Promise<IGraphQLResponse<T>> => {
  const { query, variables, accessToken } = params
  try {
    const jwtClaims = decodeJwtClaims(accessToken)
    const url = new URL(jwtClaims?.instanceUrl as string)
    url.pathname = '/services/pathfinder/v1/graphql'
    const res = (await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.accessToken}`
      },
      body: JSON.stringify({ query, variables })
    }).then((res) => {
      const status = res.status
      if (status === 200) return res.json()
      return Promise.reject(status)
    })) as IGraphQLResponse<T>
    return res
  } catch (error) {
    // This is thrown when the jwtToken can not be decoded or we get a 401 from our request
    if (error instanceof InvalidTokenError || error === 401)
      throw new UnauthenticatedError()
    else throw error
  }
}

const useLeanIX = (credentials: ILeanIXCredentials) => {
  const accessToken = new Proxy(getDefaultAccessToken(), {})
  const jwtClaims = new Proxy(getDefaultJwtClaims(), {})
  const state = {
    authenticating: false,
    authenticationCount: 0
  }

  return {
    accessToken,
    jwtClaims,
    authenticate: (): Promise<void> =>
      authenticate(credentials, accessToken, jwtClaims, state),
    executeGraphQL: <T>(query: string, variables?: Record<string, any>) =>
      executeGraphQL<T>({
        query,
        variables,
        accessToken
      })
  }
}

export default useLeanIX
