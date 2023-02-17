import { InvalidTokenError } from 'jwt-decode'
export { InvalidTokenError }

export class NetworkConnectivityError extends Error {
  constructor(hostname: string) {
    super(`host is unreachable *** ${hostname} ***`)
    this.name = 'NetworkConnectivityError'
  }
}

export class InvalidLeanIXHostError extends Error {
  constructor() {
    super('invalid leanix host in credentials')
    this.name = 'InvalidLeanIXHostError'
  }
}

export class InvalidLeanIXApiTokenError extends Error {
  constructor() {
    super('invalid apitoken in credentials')
    this.name = 'InvalidLeanIXApiTokenError'
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('403 - unauthenticated')
    this.name = 'UnauthenticatedError'
  }
}
