import { AzureFunction, Context } from '@azure/functions'
import { refreshAllApplications } from '../common'

const timerTrigger: AzureFunction = async (context: Context, timer: any) => {
  await refreshAllApplications()
}

export default timerTrigger
