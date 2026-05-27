import { z } from "zod";

export const SkillRefSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  version: z.string().optional(),
  checksum: z.string().optional(),
});

export const TargetSchema = z.enum([
  "claude",
  "cursor",
  "codex",
  "windsurf",
  "opencode",
  "openclaw",
  "gemini",
  "cline",
  "copilot",
  "agents",
  "goose",
  "pi",
  "local",
]);
export type TargetName = z.infer<typeof TargetSchema>;

export const SkillPackManifestSchema = z.object({
  schema: z.string().default("https://skillpack.dev/schemas/skillpack.v1.json"),
  name: z.string().regex(/^[a-z0-9][a-z0-9-]{1,80}$/),
  displayName: z.string().min(1).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/),
  description: z.string().min(1).max(500),
  owner: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-_]{1,80}$/).optional(),
  visibility: z.enum(["private", "unlisted", "public", "team"]).default("private"),
  tags: z.array(z.string()).default([]),
  skills: z.array(SkillRefSchema).default([]),
  shared: z
    .object({
      references: z.array(z.string()).default([]),
      assets: z.array(z.string()).default([]),
    })
    .default({ references: [], assets: [] }),
  targets: z.array(TargetSchema).default([]),
});
export type SkillPackManifest = z.infer<typeof SkillPackManifestSchema>;

export const InstalledPackSchema = z.object({
  pack: z.string(),
  version: z.string(),
  target: TargetSchema,
  targetDir: z.string().optional(),
  installedAt: z.string(),
  source: z.string(),
  skills: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      version: z.string(),
      checksum: z.string(),
    }),
  ),
});
export type InstalledPack = z.infer<typeof InstalledPackSchema>;

export type ScanResult = {
  name: string;
  path: string;
  hasSkillMd: boolean;
  description?: string;
};

export type AuditIssue = {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  file?: string;
};
