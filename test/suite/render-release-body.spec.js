import {renderReleaseBody} from '../../src/body.js'
import {group, info, setOutput} from '../mocks/actions-core.js'
import {markdown} from '../mocks/oktokit-markdown.js'
import {createRepos} from '../mocks/oktokit-repos.js'

describe('renderReleaseBody()', () => {
  const repos = createRepos()
  const owner = 'owner-org'
  const repo = 'owner-repo'
  const tag = 'tag-a'
  const env = {
    GITHUB_ACTION_REPOSITORY: 'action-org/action-repo',
  }

  it('should render release bodies correctly', async () => {
    const tagBody = `### This should be a heading

This paragraph should have
no line breaks.

This should be a separate paragraph.`

    const expected = `<!-- generated by action-org/action-repo -->
<!-- original source:
### This should be a heading

This paragraph should have
no line breaks.

This should be a separate paragraph.
-->

{
  "markdown": true,
  "mode": "markdown",
  "text": "### This should be a heading\\n\\nThis paragraph should have\\nno line breaks.\\n\\nThis should be a separate paragraph."
}`

    const actual = await renderReleaseBody({
      config: {
        generateReleaseNotes: false,
      },
      env,
      group,
      info,
      markdown,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    })

    expect(actual).toBe(expected)
  })

  it('should append release notes when there is a tag body', async () => {
    const tagBody = `body-a`

    const expected = `<!-- generated by action-org/action-repo -->
<!-- original source:
body-a
-->

{
  "markdown": true,
  "mode": "markdown",
  "text": "body-a"
}

{
  "releaseNotesBody": true,
  "owner": "owner-org",
  "repo": "owner-repo",
  "tag_name": "tag-a"
}`

    const actual = await renderReleaseBody({
      config: {
        generateReleaseNotes: true,
      },
      env,
      group,
      info,
      markdown,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    })

    expect(actual).toBe(expected)
  })

  it('should append release notes when there is no tag body', async () => {
    const tagBody = ''

    const expected = `<!-- generated by action-org/action-repo -->

{
  "releaseNotesBody": true,
  "owner": "owner-org",
  "repo": "owner-repo",
  "tag_name": "tag-a"
}`

    const actual = await renderReleaseBody({
      config: {
        generateReleaseNotes: true,
      },
      env,
      group,
      info,
      markdown,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    })

    expect(actual).toBe(expected)
  })

  it('should support empty tag bodies with no release notes', async () => {
    const tagBody = ''
    const expected = ''

    const actual = await renderReleaseBody({
      config: {
        generateReleaseNotes: false,
      },
      env,
      group,
      info,
      markdown,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    })

    expect(actual).toBe(expected)
  })
})
