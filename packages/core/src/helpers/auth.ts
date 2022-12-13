import jwtDecode from 'jwt-decode'
import type { ILeanIXCredentials, IAccessToken, IJwtClaims } from './auth.d'
import {
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  InvalidTokenError,
  UnauthenticatedError,
  NetworkConnectivityError
} from './errors'
export type { ILeanIXCredentials, IAccessToken, IJwtClaims }
export {
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  InvalidTokenError,
  UnauthenticatedError,
  NetworkConnectivityError
}

const snakeToCamel = (s: string): string =>
  s.replace(/([-_]\w)/g, (g) => g[1].toUpperCase())

// DEFAULT_ACCESS_TOKEN made immutable by using Object.freeze
export const DEFAULT_ACCESS_TOKEN = Object.freeze<IAccessToken>({
  accessToken: '',
  expired: true,
  expiresIn: -1,
  scope: '',
  tokenType: ''
})

// DEFAULT_JWT_CLAIMS made immutable by using Object.freeze
export const DEFAULT_JWT_CLAIMS = Object.freeze<IJwtClaims>({
  exp: -1,
  instanceUrl: '',
  iss: '',
  jti: '',
  sub: '',
  principal: { permission: { workspaceId: '', workspaceName: '' } }
})

export const getDefaultAccessToken = (): IAccessToken =>
  Object.assign({}, DEFAULT_ACCESS_TOKEN)

export const getDefaultJwtClaims = (): IJwtClaims =>
  Object.assign({}, DEFAULT_JWT_CLAIMS)

export const getAccessToken = async (
  credentials: ILeanIXCredentials
): Promise<IAccessToken> => {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(
      `apitoken:${credentials.apitoken}`
    ).toString('base64')}`
  }
  const options: RequestInit = { method: 'post', headers }
  try {
    const url = new URL(`https://${credentials.host}`)
    url.pathname = '/services/mtm/v1/oauth2/token'
    url.searchParams.set('grant_type', 'client_credentials')
    const accessToken: IAccessToken = await fetch(url, options)
      .then(async (res) => {
        const content = await res[
          res.headers.get('content-type') === 'application/json'
            ? 'json'
            : 'text'
        ]()
        return res.ok ? content : await Promise.reject(res.status)
      })
      .then((accessToken) =>
        Object.entries(accessToken as IAccessToken).reduce(
          (accumulator, [key, value]) => ({
            ...accumulator,
            [snakeToCamel(key)]: value
          }),
          getDefaultAccessToken()
        )
      )
    return accessToken
  } catch (error: unknown) {
    if ((error as any)?.code === 'ERR_INVALID_URL')
      throw new InvalidLeanIXHostError()
    else if ((error as any)?.cause?.code === 'ENOTFOUND')
      throw new NetworkConnectivityError(
        (error as any).hostname ?? credentials.host
      )
    else if (error === 401) throw new InvalidLeanIXApiTokenError()
    else throw error
  }
}

export const decodeJwtClaims = (accessToken: IAccessToken): IJwtClaims =>
  jwtDecode<IJwtClaims>(accessToken.accessToken)
