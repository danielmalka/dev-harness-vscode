// The 19 commands of the dev-harness plugin (`.commands/*.md`). Fixed on purpose (PRD-013 R11):
// the launcher never types free text. test/unit/commandsDrift.test.ts fails if this drifts from the plugin.
export const DH_COMMANDS: readonly string[] = [
  "auto",
  "build",
  "consolidate-memory",
  "discover",
  "doctor",
  "document",
  "fix",
  "handoff",
  "improve",
  "plan-loop",
  "plan",
  "refactor",
  "release",
  "resume",
  "review",
  "secure",
  "setup",
  "understand",
  "verify",
];
