import type {
  IAccessToken,
  IJwtClaims,
  ILeanIXCredentials
} from '../helpers/auth'

export { IAccessToken, IJwtClaims, ILeanIXCredentials }

export interface IAuthenticateState {
  authenticating: boolean
  authenticationCount: number
}

export interface IExecuteGraphQLParams {
  query: string
  variables?: Record<string, any>
}

export interface IGraphQLResponseError {
  message: string
  locations: Array<{ line: number; column: number }>
}

export interface IGraphQLResponse<T> {
  data: T | null
  errors?: IGraphQLResponseError[]
}
