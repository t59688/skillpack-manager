export class SkillPackError extends Error {
  constructor(message: string, public readonly code = "SKILLPACK_ERROR") {
    super(message);
    this.name = "SkillPackError";
  }
}

export function assert(condition: unknown, message: string, code?: string): asserts condition {
  if (!condition) {
    throw new SkillPackError(message, code);
  }
}
