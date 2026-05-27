import { describe, expect, it } from "vitest";
import { compareVersions, versionFromTag } from "../src/core/version.js";

describe("version helpers", () => {
  it("extracts semver from release tags", () => {
    expect(versionFromTag("sales-pack-v0.2.0")).toBe("0.2.0");
    expect(versionFromTag("v1.2.3-beta.1")).toBe("1.2.3-beta.1");
    expect(versionFromTag("latest")).toBeUndefined();
  });

  it("compares semver versions", () => {
    expect(compareVersions("0.2.0", "0.1.0")).toBe(1);
    expect(compareVersions("0.1.0", "0.2.0")).toBe(-1);
    expect(compareVersions("0.1.0", "0.1.0")).toBe(0);
  });
});
