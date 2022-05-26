/**
 * The body is pre-rendered using GitHub's regular Markdown flavor, because tag
 * annotations are often wrapped to a fixed column width, and GFM renders every
 * one of these newlines as a <br> tag.
 *
 * The approach used in this function sucks because it means the actual release
 * body ends up being HTML instead of the original Markdown, but I don't know of
 * any simple way to parse the tag annotation body as regular Markdown and then
 * render it as GFM, with all of the intended line breaks intact. If you know
 * how to do this correctly, please open an issue.
 *
 * Pre-rendering with regular Markdown does not render issue references (like
 * #1), but thankfully it seems like GitHub Releases will render them even
 * inside the pre-rendered HTML.
 */
export async function renderReleaseBody ({
  config,
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
}) {
  const parts = []

  if (tagBody.trim() !== '') {
    const renderedTagBody = await group('Rendering tag annotation body', async () => {
      const {data} = await markdown.render({mode: 'markdown', text: tagBody})
      info(data)

      return data
    })

    setOutput('tagBodyRendered', renderedTagBody)

    parts.push(
      '<!-- original source:',
      tagBody.trim(),
      '-->',
      '',
      renderedTagBody,
    )
  }

  if (config.generateReleaseNotes) {
    const releaseNotes = await group('Rendering automatically generated release notes', async () => {
      const {data: {body}} = await repos.generateReleaseNotes({owner, repo, tag_name: tag})
      info(body)

      return body
    })

    parts.push(
      '',
      releaseNotes,
    )
  }

  // GitHub renders unaccompanied HTML comments as plaintext, so skip the attribution
  if (parts.length < 1) return ''

  parts.unshift(`<!-- generated by ${env.GITHUB_ACTION_REPOSITORY} -->`)

  return parts.join('\n')
}
