import { TaggedError } from "effect/Data";

export class ConfigError extends TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
