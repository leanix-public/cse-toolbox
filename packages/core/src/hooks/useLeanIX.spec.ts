import useLeanIX, {
  ILeanIXCredentials,
  getDefaultAccessToken,
  getDefaultJwtClaims,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  UnauthenticatedError
} from './useLeanIX'

describe('The useLeanIX hook', () => {
  const credentials: ILeanIXCredentials = {
    host: process.env.LXR_HOST as string,
    apitoken: process.env.LXR_APITOKEN as string
  }

  beforeAll(() => {
    expect(credentials).toMatchObject({
      host: expect.any(String),
      apitoken: expect.any(String)
    })
  })

  describe('provides an authentication method', () => {
    test('that throws an InvalidLeanIXApiTokenError if credentials contain an invalid host', async () => {
      const { authenticate } = useLeanIX({ ...credentials, host: '' })
      await expect(authenticate()).rejects.toThrow(InvalidLeanIXHostError)
    })
    test('that throws an InvalidLeanIXApiTokenError if credentials contain an invalid api token', async () => {
      const { authenticate } = useLeanIX({ ...credentials, apitoken: '' })
      await expect(authenticate()).rejects.toThrow(InvalidLeanIXApiTokenError)
    })
    test('that sucessfully retrieves an access token with valid credentials', async () => {
      const { accessToken, jwtClaims, authenticate } = useLeanIX(credentials)

      expect(accessToken).toMatchObject(getDefaultAccessToken())
      expect(jwtClaims).toMatchObject(getDefaultJwtClaims())

      expect(typeof authenticate).toBe('function')
      await authenticate()

      expect(accessToken).not.toMatchObject(getDefaultAccessToken())
      expect(jwtClaims).not.toMatchObject(getDefaultJwtClaims())
    })
  })

  describe('provides graphql query method', () => {
    const VALID_GRAPHQL_QUERY = '{allFactSheets{edges{node{id type name }}}}'
    const INVALID_GRAPHQL_QUERY = 'invalidQuery'
    // Authenticate with valid credentials and get our access token
    const { accessToken, authenticate, executeGraphQL } = useLeanIX(credentials)

    test('that throws UnauthenticatedError if no valid access token is provided', async () => {
      expect(accessToken.expiresIn).toBe(-1)
      await expect(executeGraphQL(VALID_GRAPHQL_QUERY)).rejects.toThrow(
        UnauthenticatedError
      )
    })

    test('that fetches data from the LeanIX GraphQL API with a valid query string', async () => {
      await authenticate()
      expect(accessToken.expiresIn).toBeGreaterThan(0)
      const response = await executeGraphQL(VALID_GRAPHQL_QUERY)
      expect(response).toMatchObject({
        data: expect.objectContaining({
          allFactSheets: expect.any(Object)
        })
      })
    })

    test('that fetches errors from the LeanIX GraphQL API with an invalid query string', async () => {
      await authenticate()
      expect(accessToken.expiresIn).toBeGreaterThan(0)
      const response = await executeGraphQL(INVALID_GRAPHQL_QUERY)
      expect(response).toMatchObject({
        data: null,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String),
            locations: expect.arrayContaining([
              expect.objectContaining({
                column: expect.any(Number),
                line: expect.any(Number)
              })
            ])
          })
        ])
      })
    })
  })
})
