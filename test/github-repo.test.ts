import { describe, expect, it } from "vitest";
import { isRepoNameOnly, resolveGitHubRepoInput } from "../src/core/github-repo.js";

describe("GitHub repo input", () => {
  it("detects repo name only", () => {
    expect(isRepoNameOnly("xx1234")).toBe(true);
    expect(isRepoNameOnly("t59688/xx1234")).toBe(false);
  });

  it("passes through owner/repo", async () => {
    await expect(resolveGitHubRepoInput("tiechui/skillpacks")).resolves.toBe("tiechui/skillpacks");
  });

  it("requires token for repo name only", async () => {
    await expect(resolveGitHubRepoInput("xx1234")).rejects.toThrow("owner/repo");
  });
});
