import { describe, expect, it } from "vitest";
import { defaultReleaseTag, parseGitHubRepo, publishToGitHub } from "../src/core/github.js";

const fixtureArtifact = "dist/sample-sales-pack-0.1.0.skillpack";

describe("GitHub publishing helpers", () => {
  it("parses owner/repo names", () => {
    expect(parseGitHubRepo("tiechui/skillpacks")).toEqual({ owner: "tiechui", repoName: "skillpacks" });
  });

  it("rejects invalid repository names", () => {
    expect(() => parseGitHubRepo("not-a-repo")).toThrow("owner/repo");
  });

  it("builds the default release tag", () => {
    expect(defaultReleaseTag("sales-pack", "1.2.3")).toBe("sales-pack-v1.2.3");
  });

  it("supports dry runs without a GitHub token", async () => {
    const result = await publishToGitHub({
      repo: "tiechui/skillpacks",
      tag: "sales-pack-v1.2.3",
      artifactPath: fixtureArtifact,
      dryRun: true,
    });

    expect(result).toMatchObject({
      repo: "tiechui/skillpacks",
      tag: "sales-pack-v1.2.3",
      artifactName: "sample-sales-pack-0.1.0.skillpack",
      dryRun: true,
    });
    expect(result.releaseUrl).toContain("github.com/tiechui/skillpacks/releases/tag/sales-pack-v1.2.3");
  });
});
