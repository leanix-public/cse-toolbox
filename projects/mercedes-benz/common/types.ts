export interface IWebhookPayload {
  id: number
  transactionSequenceNumber: number
  type: string
  createdAt: string
  userId: string
  workspaceId: string
  factSheet: {
    id: string
    type: string
    fields: unknown[]
  }
}

export type TApplicationOperationalStatus = 'operational' | 'deprecated'

export interface IApplicationFields {
  id: string
  name: string
  lifecycle: null | string
  rev: number
  mbgAppOperationalStatus: null | TApplicationOperationalStatus
}

export interface QueueTask {
  applicationId: string
}
