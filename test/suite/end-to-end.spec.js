import {buildTagName, readFixtures} from '../helpers/fixture.js'
import {readRunId} from '../helpers/gha.js'

import {
  createAnnotatedTag,
  createLightweightTag,
  createOrphanBranchForCi,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from '../helpers/octokit.js'

const SETUP_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const describeOrSkip = process.env.GITHUB_ACTIONS == 'true' ? describe : describe.skip

describeOrSkip('End-to-end tests (only runs under GHA)', () => {
  const workflowRun = {}
  const tagRelease = {}

  beforeAll(async () => {
    // read file-based fixtures
    const runId = readRunId()
    const fixtures = await readFixtures(runId)
    const lightweightTagName = buildTagName('0.1.0', runId, 'lightweight')

    // create a new branch
    const {workflowFile} = await createOrphanBranchForCi('a')
    const headSha = workflowFile.data.commit.sha

    // create all tags in parallel
    await Promise.all([
      createLightweightTag(headSha, lightweightTagName),
      ...fixtures.map(({tagAnnotation, tagName}) => createAnnotatedTag(headSha, tagName, tagAnnotation)),
    ])

    // wait for all workflow runs to finish, and read completed runs into an object
    async function workflowRunTask (fixtureName, tagName) {
      workflowRun[fixtureName] = await waitForCompletedTagWorkflowRun('publish-release.yml', tagName)
    }

    await Promise.all([
      workflowRunTask('lightweight', lightweightTagName),
      ...fixtures.map(({name, tagName}) => workflowRunTask(name, tagName))
    ])

    // read all tag releases into an object
    async function tagReleaseTask (fixtureName, tagName) {
      tagRelease[fixtureName] = await getReleaseByTag(tagName)
    }

    await Promise.all(fixtures.map(({name, tagName}) => tagReleaseTask(name, tagName)))
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
      expect(tagRelease.annotated.data.name).toBe('0.1.0 subject-a subject-b')
    })

    it('should produce the expected release body', () => {
      const expected = `<!-- generated by eloquent/github-release-action -->
<!-- original source:
body-a
body-b
-->

<p>body-a
body-b</p>
`
      expect(tagRelease.annotated.data.body).toBe(expected)
    })
  })
})
