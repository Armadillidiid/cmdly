import { TaggedError } from "effect/Data";

export class ConfigError extends TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class CredentialsError extends TaggedError("CredentialsError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class FileSystemError extends TaggedError("FileSystemError")<{
  readonly message: string;
  readonly operation: string;
  readonly path?: string;
  readonly cause?: unknown;
}> {}
