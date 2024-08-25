import * as core from '@actions/core'
import * as github from '@actions/github'
import { WorkItemsBatchResponse } from './azdoTypes'
import { getWorkItemsBatch } from './azdo'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const adoPat: string = core.getInput('ado-pat')
    const adoProject: string = core.getInput('ado-project')
    const adoOrg: string = core.getInput('ado-org')
    const token: string = core.getInput('repo-token')
    const repo_owner: string = core.getInput('repo-owner')
    const repo_name: string = core.getInput('repo-name')
    const releaseId: number = parseInt(core.getInput('release-id'))

    if (!releaseId) {
      core.setFailed('No release id provided')
      return
    }
    if (
      !adoPat ||
      !adoProject ||
      !adoOrg ||
      !token ||
      !repo_owner ||
      !repo_name
    ) {
      core.setFailed('Missing required inputs')
      core.setOutput('workItems', '')
      return
    }

    const octokit = github.getOctokit(token)

    core.info(`\u001b[35mUpdating release notes for release: ${releaseId}`)
    const releaseResponse = await octokit.rest.repos.getRelease({
      owner: repo_owner,
      repo: repo_name,
      release_id: releaseId
    })

    core.info(`\u001b[35mRelease response: ${releaseResponse.status}`)
    core.debug(`Release response: ${releaseResponse.data}`)
    const body: string = releaseResponse.data.body ?? ''

    // find all the work item ids, making sure the regex is greedy
    const workItemIds = (body.match(/(?<!\[)AB#\d+/g) || [])
      .map(id => id.replace('AB#', ''))
      .map(id => parseInt(id, 10))

    core.info(`\u001b[35mWork item ids: ${workItemIds}`)

    if (workItemIds.length === 0) {
      core.info('\u001b[48;2;255;0;0mNo work items found in the release notes')
      core.setOutput('workItems', '')
      return
    }

    const workItems: WorkItemsBatchResponse | undefined =
      await getWorkItemsBatch(adoPat, adoOrg, adoProject, workItemIds)

    if (workItems == null) {
      core.setFailed('Failed to get work item details')
      return
    }

    let newBody: string = body

    for (const id of workItemIds) {
      const workItem = workItems.value.find(wi => wi.id === id)

      if (workItem != null) {
        core.info(
          `\u001b[35mWork item ${id}: ${workItem.fields['System.WorkItemType']} ${workItem.fields['System.Title']} (${workItem.fields['System.State']})`
        )

        // const regex = new RegExp(`(?<!\\[)AB#${id}\\b`, 'g')
        const regex = new RegExp(`(?<!\\[)AB#${id}(?!\\d)`, 'g')
        newBody = newBody.replace(
          regex,
          `[AB#${id} [${workItem.fields['System.WorkItemType']}] ${workItem.fields['System.Title']} (${workItem.fields['System.State']})](https://dev.azure.com/${adoOrg}/${adoProject}/_workitems/edit/${id})`
        )
      } else {
        core.warning(`\u001b[48;2;255;0;0mWork item ${id} not found`)
      }
    }

    core.debug(`\u001b[35mNew release notes: ${newBody}`)

    // Update the release notes
    const updateResponse = await octokit.rest.repos.updateRelease({
      owner: repo_owner,
      repo: repo_name,
      release_id: releaseId,
      body: newBody
    })
    core.info(`\u001b[35mRelease update response: ${updateResponse.status}`)

    // Set outputs for other workflow steps to use
    core.setOutput('workItems', workItemIds.join(', '))
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
