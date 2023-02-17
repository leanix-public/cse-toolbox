import {
  DEFAULT_ACCESS_TOKEN,
  DEFAULT_JWT_CLAIMS,
  getDefaultAccessToken,
  getDefaultJwtClaims,
  getAccessToken,
  decodeJwtClaims,
  ILeanIXCredentials,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError
} from './auth'

describe('The core authentication module', () => {
  let host = ''
  let apitoken = ''

  beforeAll(() => {
    host = process.env.LXR_HOST as string
    apitoken = process.env.LXR_APITOKEN as string
    expect(host).toBeTruthy()
    expect(apitoken).toBeTruthy()
  })

  test('provides a method for instantiating an accessToken object', async () => {
    expect(typeof getDefaultAccessToken).toBe('function')
    const defaultAccessToken = getDefaultAccessToken()
    expect(defaultAccessToken).toMatchObject(DEFAULT_ACCESS_TOKEN)
  })

  test('provides a method for instantiating a jwtClaims object', async () => {
    expect(typeof getDefaultJwtClaims).toBe('function')
    const defaultJwtClaims = getDefaultJwtClaims()
    expect(defaultJwtClaims).toMatchObject(DEFAULT_JWT_CLAIMS)
  })

  describe('provides the method "getAccessToken"', () => {
    test('that throws an InvalidLeanIXApiTokenError if credentials contain an invalid LeanIX host', async () => {
      const credentials: ILeanIXCredentials = { host: '', apitoken }
      await expect(getAccessToken(credentials)).rejects.toThrow(
        InvalidLeanIXHostError
      )
    })
    test('that throws an InvalidLeanIXApiTokenError if credentials contain an invalid api token', async () => {
      const credentials: ILeanIXCredentials = { host, apitoken: '' }
      await expect(getAccessToken(credentials)).rejects.toThrow(
        InvalidLeanIXApiTokenError
      )
    })
    test('that succeed with valid credentials', async () => {
      const credentials: ILeanIXCredentials = { host, apitoken }
      const accessToken = await getAccessToken(credentials)
      expect(typeof accessToken.accessToken).toBe('string') // accessToken is a string
      expect(accessToken.expired).toBe(false)
      expect(accessToken.expiresIn).toBeGreaterThan(0)
      expect(accessToken.tokenType).toBe('bearer')
      expect(accessToken.accessToken.length).toBeGreaterThan(0)
      expect(typeof accessToken.scope).toBe('string')
    })
  })

  it('provides a method for decoding the jwt claims from the access token', async () => {
    const credentials: ILeanIXCredentials = { host, apitoken }
    const accessToken = await getAccessToken(credentials)
    expect(typeof accessToken.accessToken).toBe('string') // accessToken is a string
    const jwtClaims = decodeJwtClaims(accessToken)
    // https://stackoverflow.com/questions/45692456/whats-the-difference-between-tomatchobject-and-objectcontaining
    expect(jwtClaims).toMatchObject({
      exp: expect.any(Number),
      instanceUrl: expect.any(String),
      iss: expect.any(String),
      jti: expect.any(String),
      sub: expect.any(String),
      principal: expect.objectContaining({
        id: expect.any(String),
        role: expect.any(String),
        status: expect.any(String),
        username: expect.any(String),
        permission: expect.any(Object),
        account: expect.any(Object)
      })
    })
  })
})
