export interface ILeanIXCredentials {
  host: string
  apitoken: string
}

export interface IAccessToken {
  accessToken: string
  expired: boolean
  expiresIn: number
  scope: string
  tokenType: string
}

export interface IJwtClaims {
  exp: number
  instanceUrl: string
  iss: string
  jti: string
  sub: string
  principal: { permission: { workspaceId: string; workspaceName: string } }
}
