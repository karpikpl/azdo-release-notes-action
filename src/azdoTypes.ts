/** Response type for AzDO work item batch query.
 * see: https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-items-batch?view=azure-devops-rest-7.1&tabs=HTTP
 */
export interface WorkItemsBatchResponse {
  count: number
  value: WorkItem[]
}

/** Work item type */
export interface WorkItem {
  id: number
  url: string
  fields: {
    'System.Id': number
    'System.Title': string
    'System.WorkItemType': string
    'System.State': string
  }
}
