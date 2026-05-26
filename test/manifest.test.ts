import { describe, expect, it } from "vitest";
import { SkillPackManifestSchema } from "../src/types/schema.js";

describe("SkillPackManifestSchema", () => {
  it("accepts a valid manifest", () => {
    const result = SkillPackManifestSchema.safeParse({
      name: "sales-pack",
      version: "0.1.0",
      description: "A pack for sales workflows.",
      skills: [{ name: "customer-summary", path: "skills/customer-summary" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid names", () => {
    const result = SkillPackManifestSchema.safeParse({
      name: "Sales Pack!",
      version: "0.1.0",
      description: "A pack for sales workflows.",
    });
    expect(result.success).toBe(false);
  });
});
