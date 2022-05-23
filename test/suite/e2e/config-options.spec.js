import {
  buildBodyExpression,
  buildBranchName,
  buildTagName,
  buildWorkflow,
  describeOrSkip,
  SETUP_TIMEOUT,
} from '../../helpers/e2e.js'

import {owner, repo} from '../../helpers/fixture-repo.js'
import {readRunId} from '../../helpers/gha.js'

import {
  createBranchForCi,
  createTag,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from '../../helpers/octokit.js'

describeOrSkip('End-to-end tests', () => {
  describe('Config options', () => {
    const label = 'config-options'
    const runId = readRunId()
    const branchName = buildBranchName(runId, label)
    const tagName = buildTagName('1.0.0', runId, label)
    const workflow = buildWorkflow(branchName)

    const tagAnnotation = '1.0.0'

    const config = `discussion:
  category: releases
generateReleaseNotes: true
reactions:
  - "+1"
  - laugh
  - hooray
  - heart
  - rocket
  - eyes
`

    const files = [
      {
        path: '.github/release.eloquent.yml',
        content: config,
      },
    ]

    let workflowRun, release

    beforeAll(async () => {
      const {headSha, workflowFileName} = await createBranchForCi(branchName, workflow, {
        files,
      })

      await createTag(headSha, tagName, tagAnnotation)

      workflowRun = await waitForCompletedTagWorkflowRun(workflowFileName, tagName)
      release = await getReleaseByTag(tagName)

      if (release?.html_url != null) await page.goto(release?.html_url)
    }, SETUP_TIMEOUT)

    it('should produce a workflow run that concludes in success', () => {
      expect(workflowRun.conclusion).toBe('success')
    })

    it('should append generated release notes to the release body', async () => {
      const expression = `//*[normalize-space()='Full Changelog: https://github.com/${owner}/${repo}/commits/${tagName}']`

      expect(await page.$x(buildBodyExpression(expression))).not.toBeEmpty()
    })

    it('should produce the expected release discussion', () => {
      expect(release.discussion_url).toMatch(/^https:\/\/github.com\/eloquent-fixtures\/github-release-action-ci\/discussions\/\d+$/)
    })

    it.each([
      ['+1'],
      ['laugh'],
      ['hooray'],
      ['heart'],
      ['rocket'],
      ['eyes'],
    ])('should produce the expected release reactions (%s)', reaction => {
      const {reactions: {[reaction]: actual = 0} = {}} = release

      expect(actual).toBeGreaterThan(0)
    })
  })
})
