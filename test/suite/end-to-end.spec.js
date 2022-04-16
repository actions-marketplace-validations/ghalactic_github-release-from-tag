import {resolve} from 'path'

import {buildTagName, readFixtures} from '../helpers/fixture.js'
import {readRunId} from '../helpers/gha.js'

import {
  createAnnotatedTag,
  createLightweightTag,
  createOrphanBranchForCi,
  getReleaseByTag,
  waitForCompletedTagWorkflowRuns,
} from '../helpers/octokit.js'

const SETUP_TIMEOUT = 3 * 60 * 1000 // 3 minutes
const describeOrSkip = process.env.GITHUB_ACTIONS == 'true' ? describe : describe.skip

describeOrSkip('End-to-end tests (only runs under GHA)', () => {
  const fixturesByName = {}
  const workflowRun = {}
  const tagRelease = {}

  beforeAll(async () => {
    // read file-based fixtures
    const runId = readRunId()
    const fixtures = await readFixtures(resolve(__dirname, '../fixture'), runId)
    fixtures.forEach(fixture => { fixturesByName[fixture.name] = fixture })
    const lightweightTagName = buildTagName('0.1.0', runId, 'lightweight')

    // create a new branch
    const {workflowFile} = await createOrphanBranchForCi()
    const workflowFileName = workflowFile.data.content.name
    const headSha = workflowFile.data.commit.sha

    // create all tags in parallel
    await Promise.all([
      createLightweightTag(headSha, lightweightTagName),
      ...fixtures.map(async ({tagAnnotation, tagName}) => createAnnotatedTag(headSha, tagName, tagAnnotation)),
    ])

    // wait for all workflow runs to finish, and read completed runs into an object
    async function workflowRunsTask () {
      const [
        lightweightRun,
        ...fixtureRuns
      ] = await waitForCompletedTagWorkflowRuns(workflowFileName, [
        lightweightTagName,
        ...fixtures.map(fixture => fixture.tagName),
      ])

      workflowRun.lightweight = lightweightRun
      fixtures.forEach((fixture, index) => {
        workflowRun[fixture.name] = fixtureRuns[index]
      })
    }

    await workflowRunsTask()

    // read all tag releases into an object
    async function tagReleaseTask (fixtureName, tagName) {
      tagRelease[fixtureName] = await getReleaseByTag(tagName)
    }

    await Promise.all(fixtures.map(async ({name, tagName}) => tagReleaseTask(name, tagName)))
  }, SETUP_TIMEOUT)

  describe('for lightweight tags', () => {
    it('should conclude in failure', () => {
      expect(workflowRun.lightweight.conclusion).toBe('failure')
    })
  })

  describe('for annotated tags', () => {
    it('should conclude in success', () => {
      expect(workflowRun.annotated.conclusion).toBe('success')
    })

    it('should produce the expected release name', () => {
      expect(tagRelease.annotated.data.name).toBe(fixturesByName.annotated.releaseName)
    })

    it('should produce the expected release body', () => {
      expect(tagRelease.annotated.data.body).toBe(fixturesByName.annotated.releaseBody)
    })
  })
})
