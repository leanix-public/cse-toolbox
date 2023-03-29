import { useLeanIX, UnauthenticatedError } from 'lx-core'
import type {
  TApplicationOperationalStatus,
  IApplicationFields,
  QueueTask
} from './types'

export const { authenticate, accessToken, executeGraphQL } = useLeanIX({
  // Local development: environment variables defined in local.settings.json
  host: process.env.LXR_HOST as string,
  apitoken: process.env.LXR_APITOKEN as string
})

// GraphQL query for fetching the maturity fields for a Business Capability
export const fetchApplicationFields = async (
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

export const mutateApplicationStatus = async (
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

export const getExpectedStatus = (lifecycle: string | null) => {
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

export const fetchApplicationsPage = async (after?: string) => {
  const { pageInfo, factSheets } = await executeGraphQL<{
    allFactSheets: {
      pageInfo: {
        hasNextPage: boolean
        endCursor: string
      }
      edges: Array<{
        node: {
          id: string
          type: string
          name: string
          rev: number
          lifecycle: null | { asString: string }
          mbgAppOperationalStatus: TApplicationOperationalStatus | null
        }
      }>
    }
  }>(
    `
  query ($after: String) {
    allFactSheets(factSheetType: Application, first: 5000, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ... on Application {
            id
            type
            rev
            name
            lifecycle { asString }
            mbgAppOperationalStatus
          }
        }
      }
    }
  }`,
    { after }
  ).then((res) => {
    if (Array.isArray(res.errors) || res.data === null) {
      console.error('Error while fetching Applications page', res.errors)
      throw new Error('error fetching applications page')
    }
    const { pageInfo, edges } = res.data.allFactSheets
    const factSheets: IApplicationFields[] = edges.map(({ node }) => {
      const { id, name, lifecycle, mbgAppOperationalStatus, rev } = node
      const applicationFields: IApplicationFields = {
        id,
        name,
        rev,
        lifecycle: lifecycle?.asString ?? null,
        mbgAppOperationalStatus
      }
      return applicationFields
    })
    return { pageInfo, factSheets }
  })
  return { pageInfo, factSheets }
}

export const refreshAllApplications = async () => {
  // If we are not authenticated yet, lets get an accessToken
  if (accessToken.expiresIn === -1) await authenticate()
  const applications: IApplicationFields[] = []
  let hasNextPage = true
  let after: string = ''
  do {
    const { pageInfo, factSheets } = await fetchApplicationsPage(after)
    applications.push(...factSheets)
    ;({ hasNextPage, endCursor: after } = pageInfo)
  } while (hasNextPage)
  let mutationCount = 0
  for (const application of applications) {
    const { lifecycle, mbgAppOperationalStatus, name, rev } = application
    const expectedStatus = getExpectedStatus(lifecycle)
    if (mbgAppOperationalStatus !== expectedStatus) {
      await mutateApplicationStatus(application.id, rev, expectedStatus)
      console.log(`UPDATING: ${name} => ${expectedStatus}`)
      mutationCount++
    }
  }
  if (mutationCount === 0)
    console.log('Done refreshing applications, nothing to do...')
  else console.log(`Done, updated ${mutationCount} applications`)
}

export const queuedTask = async (task: QueueTask) => {
  let applicationFields: IApplicationFields | null = null
  try {
    applicationFields = await fetchApplicationFields(task.applicationId)
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      await authenticate()
      applicationFields = await fetchApplicationFields(task.applicationId)
    } else throw err
  }
  if (applicationFields === null) {
    console.error(
      `Could not fetch fields for application: ${task.applicationId}`
    )
    return
  }
  const { lifecycle, mbgAppOperationalStatus, name, rev } = applicationFields
  const expectedStatus = getExpectedStatus(lifecycle)
  if (mbgAppOperationalStatus !== expectedStatus) {
    await mutateApplicationStatus(task.applicationId, rev, expectedStatus)
    console.log(`SET: ${name} => ${expectedStatus}`)
  }
}
