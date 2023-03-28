

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
