import * as core from '@actions/core'
import { WorkItemsBatchResponse } from './azdoTypes'

/**
 * Retrieves work item details in batch from Azure DevOps.
 * @param adoPat - The personal access token for Azure DevOps.
 * @param adoOrg - The organization name in Azure DevOps.
 * @param adoProject - The project name in Azure DevOps.
 * @param workItemIds - An array of work item IDs to retrieve.
 * @returns A promise that resolves to a WorkItemsBatchResponse object or undefined if the request fails.
 */
export async function getWorkItemsBatch(
  adoPat: string,
  adoOrg: string,
  adoProject: string,
  workItemIds: number[]
): Promise<WorkItemsBatchResponse | undefined> {
  try {
    // get work item details
    const auth = Buffer.from(`:${adoPat}`).toString('base64')

    // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-items-batch?view=azure-devops-rest-7.1&tabs=HTTP
    const adoResponse = await fetch(
      `https://dev.azure.com/${adoOrg}/${adoProject}/_apis/wit/workitemsbatch?api-version=7.1-preview.1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: workItemIds,
          fields: [
            'System.Id',
            'System.Title',
            'System.WorkItemType',
            'System.State'
          ]
        })
      }
    )

    core.info(`\u001b[35mWork item batch response: ${adoResponse.status}`)

    if (adoResponse.status !== 200) {
      return
    }

    const workItems: WorkItemsBatchResponse = await adoResponse.json()
    return workItems
  } catch (error) {
    core.error(`\u001b[48;2;255;0;0mError getting work items: ${error}`)
  }
}
