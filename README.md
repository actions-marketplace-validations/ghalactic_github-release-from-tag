# GitHub Release from Tag

A [GitHub Action] that creates [GitHub Releases] from your Git tags. Does what
you _probably wish_ GitHub would just do without the need to use GitHub Actions.

[github action]: https://docs.github.com/actions
[github releases]: https://docs.github.com/repositories/releasing-projects-on-github/about-releases

## Overview

This action creates releases by sourcing the release data from the place where
it makes the most sense to keep it — your Git tags. By harnessing [SemVer] to
determine pre-release status, and [Markdown] for formatting, your GitHub
Releases become a natural extension of your Git tags.

[semver]: https://semver.org/
[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

In addition, this action has been designed to feel like it _could_ be a
first-party GitHub feature. Its feature set closely mirrors what you have access
to when you [publish a GitHub Release manually].

[publish a github release manually]: https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release

## Features

- Minimal [configuration], or often **zero** configuration
- [SemVer] stability determines **pre-release** status
- [Markdown] support in tag annotation messages
- [Asset] uploading with support for **labels**
- [Automated release notes] support
- [Release discussion] creation
- Releases can be created as **drafts**
- Creation of initial **🚀 reactions ❤️** to promote engagement

[configuration]: #configuration
[semver]: https://semver.org/
[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github
[asset]: https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository#:~:text=drag%20and%20drop
[automated release notes]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes
[release discussion]: https://docs.github.com/discussions

## Usage

### Workflow for tag creation

Most of the time you will want tag pushes to trigger release publishing:

```yaml
# .github/workflows/publish-release.yml
name: Publish release
on:
  push:
    tags:
      - "*"
jobs:
  publish:
    runs-on: ubuntu-latest
    name: Publish release
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Publish release
        uses: eloquent/github-release-action@v2
```

It's also possible to use [`if` conditionals] to restrict the release publishing
step inside a multi-purpose workflow, so that it only runs on tag pushes:

[`if` conditionals]: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsif

```yaml
- name: Publish release
  uses: eloquent/github-release-action@v2
  if: github.ref_type == 'tag'
```

### Workflow for manual runs

You may also want to be able to manually publish releases for a specific tag.
This allows you to remedy failed publish attempts, or publish tags that were
created before automated release publishing was set up:

```yaml
# .github/workflows/publish-release-manual.yml
name: Publish release (manual)
on:
  workflow_dispatch:
    inputs:
      tag:
        description: The tag to publish
        required: true
jobs:
  publish:
    runs-on: ubuntu-latest
    name: Publish release
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          ref: refs/tags/${{ github.event.inputs.tag }}
      - name: Publish release
        uses: eloquent/github-release-action@v2
```

### Release stability

This action uses [SemVer] rules to determine whether a tag should be published
as a **pre-release**, or a **stable release**. The decision is made as follows:

- If the tag name is a **"stable"** SemVer version, it's considered a **stable
  release**.
- If the tag name is an **"unstable"** SemVer version, it's considered a
  **pre-release**.
- If the tag name is **not** a valid SemVer version, it's considered a
  **pre-release**.

[semver]: https://semver.org/

The standard SemVer rules are relaxed a bit to allow for tag names with a `v`
prefix (e.g. `v1.2.3`), as well as major/minor version tag names (e.g. `v1`,
`v1.2`) as per [GitHub's recommendations for action versioning].

[github's recommendations for action versioning]: https://github.com/actions/toolkit/blob/%40actions/core%401.1.0/docs/action-versioning.md#recommendations

It's also possible to [configure] an override for this behavior, and force a
release to be published as either a **pre-release** or **stable release**.

[configure]: #configuration

#### Example release stabilities

| Tag name                             | Is SemVer? | Release stability |
| :----------------------------------- | :--------- | :---------------- |
| `1` / `v1`                           | no         | stable release    |
| `1.2` / `v1.2`                       | no         | stable release    |
| `1.2.3` / `v1.2.3`                   | yes        | stable release    |
| `1.2.3+21AF26D3` / `v1.2.3+21AF26D3` | yes        | stable release    |
| `0.1.0` / `v0.1.0`                   | yes        | pre-release       |
| `1.2.3-alpha` / `v1.2.3-alpha`       | yes        | pre-release       |
| `0` / `v0`                           | no         | pre-release       |
| `0.1` / `v0.1`                       | no         | pre-release       |
| `something-else`                     | no         | pre-release       |

### Release name and body

This action generates a release **name** and **body** from your **tag annotation
message**. Git already breaks your tag annotation messages into two parts that
line up with each part of a GitHub release:

- The tag annotation **subject** becomes the release **name**.
- The tag annotation **body** is rendered as [Markdown], and used as the release
  **body**.

[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

The tag annotation "subject" is just the first **paragraph** of the message. The
"body" is everything that follows:

    This is part of the subject.
    This is also considered part of the subject.

    This is the beginning of the body.
    This is also part of the body.

    The body can have multiple paragraphs.

#### Markdown support

For the most part, [Markdown] "just works" how you would expect. You can write
Markdown in the "body" portion of your tag annotations, and it will be rendered
in the body of the releases published by this action. Shorthand issues
references like `#42`, and mentions like `@username` also "just work".

[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

##### Markdown headings in tag annotation messages

When authoring tag annotation messages, you might run into the issue that
Markdown **headings** are lines that start with a `#` character, which Git
interprets as a **comment**. You can get around this limitation by using the
following Git command to create the tag:

    git tag --annotate --cleanup=whitespace --edit --message "" 1.0.0

You might want to add a **Git alias** to make it easier to remember the command:

    git config --global alias.tag-md 'tag --annotate --cleanup=whitespace --edit --message ""'

With the above alias configured, you can then use `git tag-md` to create tags
with Markdown tag annotation bodies:

    git tag-md 1.0.0

##### Markdown line breaks

It's common for tag annotation messages to be "wrapped" at a fixed column width,
for readability when viewed as plain text:

    1.0.0

    This provides an example of a Git tag annotation body that has been
    "hard wrapped". This is a very common practice.

If we were to copy the body from the tag annotation message above directly into
the GitHub release, the line breaks would be interpreted as explicit line breaks
in the final HTML, like so:

> This provides an example of a Git tag annotation body that has been\
> "hard wrapped". This is a very common practice.

Most people would probably consider this an undesirable result, and would rather
that the above two lines be combined into a single line in the resulting HTML,
similar to how GitHub behaves when rendering `README.md` files.

To avoid this issue, this action **pre-renders** the tag annotation body to HTML
(using [GitHub's API], in `markdown` mode) before inserting it into the release
body, meaning that the line breaks will be interpreted in a way that works
better for "hard wrapped" tag annotation messages. Using this method, the above
tag annotation body would be rendered like so:

[github's api]: https://docs.github.com/rest/markdown#render-a-markdown-document

> This provides an example of a Git tag annotation body that has been
> "hard wrapped". This is a very common practice.

To aid in making manual edits after release publication, the original Markdown
source is also kept in a comment in the release body.

### Automated release notes

This action supports GitHub's [automatically generated release notes] feature.
You can enable this feature via the [configuration file], or via [action
inputs]:

[automatically generated release notes]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes
[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/release.eloquent.yml:
generateReleaseNotes: true
```

```yaml
# In your workflow:
- uses: eloquent/github-release-action@v2
  with:
    generateReleaseNotes: "true"
```

When enabled, automated release notes will be generated and appended to each
release body. The release notes are based off of **pull requests**, and can be
[configured to customize how they are generated].

[configured to customize how they are generated]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes#configuring-automatically-generated-release-notes

<details>
<summary><strong>Example automated release notes</strong></summary>
<br>

> ## What's Changed
>
> - Add feature A by @ezzatron in [#5](#)
> - Add feature B by @ezzatron in [#6](#)
> - Fix bug A by @ezzatron in [#7](#)
> - Fix bug B by @ezzatron in [#8](#)
> - Add docs for feature A by @ezzatron in [#9](#)
> - Add docs for feature B by @ezzatron in [#10](#)
>
> ## New Contributors
>
> - @ezzatron made their first contribution in [#5](#)
>
> **Full Changelog**: https://github.com/owner/repo/commits/1.0.0

</details>

## Configuration

> **Tip:** Try to use as _little_ configuration as possible. Everything here is
> **optional**, and **the less configuration the better**.

### The configuration file

This action supports an **optional** YAML configuration file, with options for
affecting how releases are published:

> **Note:** These options can be overridden by any equivalent [action inputs]. A
> [JSON Schema definition] is also available.

[action inputs]: #action-inputs
[json schema definition]: src/config/schema.js

```yaml
# .github/release.eloquent.yml

# Set to true to produce releases in a draft state.
draft: true

# Set to true to append automatically generated release notes to the release body.
generateReleaseNotes: true

# Set to true or false to override the automatic tag name based pre-release detection.
prerelease: false

# Reactions to create for releases.
reactions: ["+1", laugh, hooray, heart, rocket, eyes]

assets:
  # A path is required for each asset.
  - path: assets/text/file-a.txt

  # The name and label are optional.
  - path: assets/json/file-b.json
    name: custom-name-b.json
    label: Label for file-b.json

discussion:
  # The category to use when creating the discussion.
  category: category-a

  # Reactions to create for discussions linked to releases.
  reactions: ["+1", "-1", laugh, hooray, confused, heart, rocket, eyes]
```

### Action inputs

This action supports **optional** inputs for affecting how releases are
published:

> **Note:** These inputs take precedence over any equivalent options specified
> in [the configuration file]. The [action metadata file] contains the actual
> definitions for these inputs.

[the configuration file]: #the-configuration-file
[action metadata file]: action.yml

```yaml
- uses: eloquent/github-release-action@v2
  with:
    # Set to "true" to produce releases in a draft state.
    draft: "true"

    # Set to "true" to append automatically generated release notes to the release body.
    generateReleaseNotes: "true"

    # Set to "true" or "false" to override the automatic tag name based pre-release detection.
    prerelease: "false"

    # Reactions to create for releases.
    reactions: +1,laugh,hooray,heart,rocket,eyes

    # Use a custom GitHub token.
    token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}

    # The category to use when creating the discussion.
    discussionCategory: category-a

    # Reactions to create for discussions linked to releases.
    discussionReactions: +1,-1,laugh,hooray,confused,heart,rocket,eyes
```

## Action outputs

This action makes a number of outputs available:

> **Note:** The [action metadata file] contains the actual definitions for these
> outputs. The example below should give you some idea what each output looks
> like. The outputs aren't actually YAML of course, it's just for explanatory
> purposes.

[action metadata file]: action.yml

```yaml
# The ID of the published release.
releaseId: "68429422"

# The URL of the published release.
releaseUrl: "https://github.com/owner/repo/releases/tag/1.0.0"

# The asset upload URL for the published release (as an RFC 6570 URI Template).
releaseUploadUrl: "https://uploads.github.com/repos/owner/repo/releases/68429422/assets{?name,label}"

# Contains "true" if a new release was created.
releaseWasCreated: "true"

# The name of the published release.
releaseName: "1.0.0 Leopard Venom 🐆"

# The body of the published release.
releaseBody: |
  <!-- generated by eloquent/github-release-action -->
  <!-- original source:
  This is the first
  _stable_
  release 🎉
  -->

  <p>This is the first <em>stable</em> release 🎉</p>

  ## What's Changed ...

# The name of the tag that caused the release.
tagName: "1.0.0"

# Contains "true" for any tag considered "stable".
tagIsStable: "true"

# Contains "true" for SemVer version tags.
tagIsSemVer: "true"

# The "subject" portion of the tag annotation.
tagSubject: |
  1.0.0
  Leopard Venom 🐆

# The "body" portion of the tag annotation.
tagBody: |
  This is the first
  _stable_
  release 🎉

# The "body" portion of the tag annotation, rendered as HTML.
tagBodyRendered: "<p>This is the first <em>stable</em> release 🎉</p>"

# The generated release notes produced by GitHub. See "Automated release notes".
generatedReleaseNotes: "## What's Changed ..."

# The ID of the release discussion.
discussionId: "D_kwDOG4Ywls4APsqF"

# The unique number of the release discussion.
discussionNumber: "93"

# The URL of the release discussion.
discussionUrl: "https://github.com/owner/repo/discussions/93"

# A JSON array of objects describing the release assets.
assets: |
  [
    {
      "apiUrl": "https://api.github.com/repos/owner/repo/releases/assets/67328106",
      "downloadUrl": "https://github.com/owner/repo/releases/download/1.0.0/file.txt",
      "id": 67328106,
      "nodeId": "RA_kwDOG4Ywls4EA1hq",
      "name": "file.txt",
      "label": "Label for file.txt",
      "state": "uploaded",
      "contentType": "application/json",
      "size": 16,
      "downloadCount": 0,
      "createdAt": "2022-06-02T09:37:56Z",
      "updatedAt": "2022-06-02T09:37:56Z"
    },
    ...
  ]
```

### Using action outputs

Action outputs can be used to integrate with other steps in a workflow. Simply
add an `id` to the step that uses this action, and reference the output you
need as demonstrated below:

```yaml
- uses: eloquent/github-release-action@v2
  id: publishRelease
- env:
    RELEASE_URL: ${{ steps.publishRelease.outputs.releaseUrl }}
  run: echo Released to $RELEASE_URL
```

The `assets` output is a JSON array, and needs to be decoded before its contents
can be accessed:

> **Note:** The assets are ordered by their `name` property.

```yaml
- uses: eloquent/github-release-action@v2
  id: publishRelease
- env:
    DOWNLOAD_URL: ${{ fromJSON(steps.publishRelease.outputs.assets)[0].downloadUrl }}
  run: echo Download the first asset from $DOWNLOAD_URL
```
