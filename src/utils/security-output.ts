import chalk from "chalk";
import { PackSecuritySummary, SecurityFinding } from "../core/security.js";

function skillCount(findings: SecurityFinding[]): number {
  return new Set(findings.map((finding) => finding.skill)).size;
}

function skillNoun(count: number): string {
  return count === 1 ? "skill" : "skills";
}

function ok(message: string): void {
  console.log(`${chalk.green("✓")} ${message}`);
}

function warn(message: string): void {
  console.log(`${chalk.yellow("!")} ${message}`);
}

function riskColor(risk: PackSecuritySummary["riskLevel"]): (value: string) => string {
  if (risk === "High") return chalk.red;
  if (risk === "Medium") return chalk.yellow;
  return chalk.green;
}

export function printSecuritySummary(summary: PackSecuritySummary): void {
  console.log("Security summary:");
  console.log("");

  const secretSkills = skillCount(summary.secrets);
  if (secretSkills === 0) ok("No secrets detected");
  else warn(`${secretSkills} ${skillNoun(secretSkills)} ${secretSkills === 1 ? "contains" : "contain"} possible secrets`);

  const remoteScriptSkills = skillCount(summary.remoteInstallScripts);
  if (remoteScriptSkills === 0) ok("No remote install scripts");
  else warn(`${remoteScriptSkills} ${skillNoun(remoteScriptSkills)} ${remoteScriptSkills === 1 ? "contains" : "contain"} remote install scripts`);

  const executableScriptSkills = skillCount(summary.executableScripts);
  if (executableScriptSkills === 0) ok("No executable scripts detected");
  else warn(
    `${executableScriptSkills} ${skillNoun(executableScriptSkills)} ${executableScriptSkills === 1 ? "contains" : "contain"} executable script${executableScriptSkills === 1 ? "" : "s"}`,
  );

  const filesystemSkills = skillCount(summary.filesystemAccess);
  if (filesystemSkills === 0) ok("No filesystem access references");
  else warn(`${filesystemSkills} ${skillNoun(filesystemSkills)} ${filesystemSkills === 1 ? "references" : "reference"} filesystem access`);

  console.log("");
  console.log(`Risk level: ${riskColor(summary.riskLevel)(summary.riskLevel)}`);
  console.log("");
}
