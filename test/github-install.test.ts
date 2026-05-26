import { describe, expect, it } from "vitest";
import { isGitHubInstallSource, parseGitHubInstallSource } from "../src/core/github-install.js";

describe("GitHub install source parsing", () => {
  it("parses github:owner/repo", () => {
    expect(parseGitHubInstallSource("github:tiechui/my-skillpacks")).toEqual({
      repo: "tiechui/my-skillpacks",
      tag: undefined,
    });
  });

  it("parses github:repo without owner (resolved later with token)", () => {
    expect(parseGitHubInstallSource("github:xx1234")).toEqual({
      repo: "xx1234",
      tag: undefined,
    });
  });

  it("parses github:owner/repo@tag", () => {
    expect(parseGitHubInstallSource("github:tiechui/my-skillpacks@1234-v0.1.0")).toEqual({
      repo: "tiechui/my-skillpacks",
      tag: "1234-v0.1.0",
    });
  });

  it("parses https github repo URL", () => {
    expect(parseGitHubInstallSource("https://github.com/t59688/xx1234")).toEqual({
      repo: "t59688/xx1234",
      tag: undefined,
    });
  });

  it("parses https github release tag URL", () => {
    expect(parseGitHubInstallSource("https://github.com/t59688/xx1234/releases/tag/1234-v0.1.0")).toEqual({
      repo: "t59688/xx1234",
      tag: "1234-v0.1.0",
    });
  });

  it("detects github install sources", () => {
    expect(isGitHubInstallSource("github:owner/repo")).toBe(true);
    expect(isGitHubInstallSource("./dist/foo.skillpack")).toBe(false);
  });
});
