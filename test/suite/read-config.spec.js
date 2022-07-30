import { join } from "path";

import { readConfig } from "../../src/config/reading.js";
import { getInput, group, info } from "../mocks/actions-core.js";

const { chdir, cwd } = process;
const fixturesPath = join(__dirname, "../fixture/config");

describe("readConfig()", () => {
  let originalCwd;

  beforeEach(async () => {
    originalCwd = cwd();
  });

  afterEach(async () => {
    chdir(originalCwd);
  });

  it("should be able to read comprehensive valid configs", async () => {
    chdir(join(fixturesPath, "comprehensive"));
    const actual = await readConfig({ getInput, group, info });

    const expected = {
      assets: [
        {
          path: "assets/text/file-a.txt",
          name: "",
          label: "",
        },
        {
          path: "assets/json/file-b.json",
          name: "custom-name-b.json",
          label: "Label for file-b.json",
        },
      ],
      discussion: {
        category: "category-a",
        reactions: [
          "+1",
          "-1",
          "laugh",
          "hooray",
          "confused",
          "heart",
          "rocket",
          "eyes",
        ],
      },
      draft: true,
      generateReleaseNotes: true,
      prerelease: false,
      reactions: ["+1", "laugh", "hooray", "heart", "rocket", "eyes"],
    };

    expect(actual).toEqual(expected);
  });

  it("should return a default config the config file is empty", async () => {
    chdir(join(fixturesPath, "empty"));
    const actual = await readConfig({ getInput, group, info });

    const expected = {
      assets: [],
      discussion: {
        category: "",
        reactions: [],
      },
      draft: false,
      generateReleaseNotes: false,
      reactions: [],
    };

    expect(actual).toEqual(expected);
  });

  it("should return a default config when no config file exists", async () => {
    chdir(join(fixturesPath, "none"));
    const actual = await readConfig({ getInput, group, info });

    const expected = {
      assets: [],
      discussion: {
        category: "",
        reactions: [],
      },
      draft: false,
      generateReleaseNotes: false,
      reactions: [],
    };

    expect(actual).toEqual(expected);
  });

  it("should throw an error if the config file contains invalid YAML", async () => {
    chdir(join(fixturesPath, "invalid-yaml"));

    await expect(() => readConfig({ getInput, group, info })).rejects.toThrow();
  });

  it("should override config options with actions inputs", async () => {
    chdir(join(fixturesPath, "comprehensive"));

    const getInput = (name) => {
      switch (name) {
        case "discussionCategory":
          return "category-override-a";
        case "discussionReactions":
          return "eyes,+1";
        case "draft":
          return "false";
        case "generateReleaseNotes":
          return "false";
        case "prerelease":
          return "true";
        case "reactions":
          return "heart,hooray,rocket";
      }

      return "";
    };

    const actual = await readConfig({ getInput, group, info });

    const expected = {
      discussion: {
        category: "category-override-a",
        reactions: ["eyes", "+1"],
      },
      draft: false,
      generateReleaseNotes: false,
      prerelease: true,
      reactions: ["heart", "hooray", "rocket"],
    };

    expect(actual).toMatchObject(expected);
  });

  it("should correctly fill in discussions defaults when using action input overrides", async () => {
    chdir(join(fixturesPath, "empty"));

    const getInput = (name) =>
      name === "discussionReactions" ? "eyes,+1" : "";
    const actual = await readConfig({ getInput, group, info });

    const expected = {
      discussion: {
        category: "",
        reactions: ["eyes", "+1"],
      },
    };

    expect(actual).toMatchObject(expected);
  });
});
