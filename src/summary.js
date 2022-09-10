import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";

const BODY_TOKEN = "{{GITHUB_RELEASE_ACTION_BODY}}";

export function renderSummary({
  body,
  discussion_url,
  draft,
  html_url,
  name,
  prerelease,
  tag_name,
}) {
  const rendered = toMarkdown(
    {
      type: "root",
      children: [
        ...titleAST(),
        ...detailsAST(),
        ...bodyAST(),
        ...definitionsAST(),
      ],
    },
    {
      extensions: [gfmToMarkdown()],
    }
  );

  return rendered.replace(BODY_TOKEN, body);

  function titleAST() {
    return [
      {
        type: "heading",
        depth: 3,
        children: [
          {
            type: "text",
            value: draft ? "Drafted release " : "Released ",
          },
          {
            type: "inlineCode",
            value: name,
          },
        ],
      },
    ];
  }

  function detailsAST() {
    const headings = [
      [
        {
          type: "text",
          value: "Tag",
        },
      ],
      [
        {
          type: "text",
          value: "Stability",
        },
      ],
      [
        {
          type: "text",
          value: "Release",
        },
      ],
    ];

    const cells = [
      [
        {
          type: "inlineCode",
          value: tag_name,
        },
      ],
      [
        {
          type: "text",
          value: prerelease ? "⚠️ Pre-release" : "✅ Stable",
        },
      ],
      [
        {
          type: "linkReference",
          identifier: "release-url",
          label: "release-url",
          referenceType: "full",
          children: [
            {
              type: "inlineCode",
              value: name,
            },
          ],
        },
      ],
    ];

    if (discussion_url) {
      const discussionNumber = new URL(discussion_url).pathname
        .split("/")
        .pop();

      headings.push([
        {
          type: "text",
          value: "Discussion",
        },
      ]);
      cells.push([
        {
          type: "linkReference",
          identifier: "discussion-url",
          label: "discussion-url",
          referenceType: "full",
          children: [
            {
              type: "text",
              value: `#${discussionNumber}`,
            },
          ],
        },
      ]);
    }

    const align = headings.map(() => "left");

    return [createTableAST(align, headings, [cells])];
  }

  function bodyAST() {
    if (!body.trim()) return [];

    return createDetailsAST("<strong>Release body</strong>", [
      {
        type: "text",
        value: BODY_TOKEN,
      },
    ]);
  }

  function definitionsAST() {
    const definitions = [];

    if (discussion_url) {
      definitions.push({
        type: "definition",
        identifier: "discussion-url",
        label: "discussion-url",
        url: discussion_url,
        title: null,
      });
    }

    definitions.push({
      type: "definition",
      identifier: "release-url",
      label: "release-url",
      url: html_url,
      title: null,
    });

    return definitions;
  }

  function createDetailsAST(summaryHTML, children) {
    return [
      {
        type: "html",
        value: `<details><summary>${summaryHTML}</summary>`,
      },
      ...children,
      {
        type: "html",
        value: "</details>",
      },
    ];
  }

  function createTableAST(align, headings, rows) {
    return {
      type: "table",
      align,
      children: [
        {
          type: "tableRow",
          children: headings.map((heading) => ({
            type: "tableCell",
            children: heading,
          })),
        },
        ...rows.map((row) => ({
          type: "tableRow",
          children: row.map((cell) => ({
            type: "tableCell",
            children: cell,
          })),
        })),
      ],
    };
  }
}
