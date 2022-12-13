import useLeanIX from './hooks/useLeanIX'
import {
  UnauthenticatedError,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  NetworkConnectivityError
} from './helpers/errors'

import type { ILeanIXCredentials } from './hooks/useLeanIX'

export {
  useLeanIX,
  ILeanIXCredentials,
  UnauthenticatedError,
  InvalidLeanIXApiTokenError,
  InvalidLeanIXHostError,
  NetworkConnectivityError
}
