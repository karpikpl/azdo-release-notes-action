import fs from 'fs'
import path from 'path'
import { getWorkItemsBatch } from '../src/azdo'

const adoResponse = fs.readFileSync(
  path.join(__dirname, 'test_cases/big', 'ado_response.json'),
  'utf8'
)
describe('Azure DevOps API tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // mock fetch
    global.fetch = jest.fn(
      async () =>
        await Promise.resolve({
          json: async () => await Promise.resolve(JSON.parse(adoResponse)),
          status: 200
        })
    ) as jest.Mock
  })

  it('calls azdo API to get workitems', async () => {
    const expectedAuth = Buffer.from(`:${'token'}`).toString('base64')
    const ids = [11, 1, 111, 5, 14, 143, 112]

    const workItems = await getWorkItemsBatch(
      'token',
      'my-org',
      'my-project',
      ids
    )

    expect(fetch).toHaveBeenCalledWith(
      'https://dev.azure.com/my-org/my-project/_apis/wit/workitemsbatch?api-version=7.1-preview.1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedAuth}`
        }),
        body: expect.stringContaining(ids.join(','))
      })
    )
    expect(workItems).toBeDefined()
    expect(workItems?.value.map(wi => wi.id)).toEqual(
      expect.arrayContaining(ids)
    )
  })

  it('returns undefined on error', async () => {
    global.fetch = jest.fn(
      async () =>
        await Promise.resolve({
          status: 500
        })
    ) as jest.Mock

    const workItems = await getWorkItemsBatch(
      'token',
      'my-org',
      'my-project',
      [1, 2, 3]
    )

    expect(workItems).toBeUndefined()
  })

  it('returns undefined on catch error', async () => {
    global.fetch = jest.fn(
      async () => await Promise.reject(new Error('error'))
    ) as jest.Mock

    const workItems = await getWorkItemsBatch(
      'token',
      'my-org',
      'my-project',
      [1, 2, 3]
    )

    expect(workItems).toBeUndefined()
  })
})
