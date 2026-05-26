import { SkillPackError } from "../utils/errors.js";

export type VersionBump = "patch" | "minor" | "major";

export function bumpVersion(version: string, bump: VersionBump): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) throw new SkillPackError(`Cannot bump invalid semver version: ${version}`, "INVALID_VERSION");
  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);
  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}
