import { Schema } from "effect";

export const configSchema = Schema.Struct({
  model: Schema.String,
  provider: Schema.String,
});
export type Config = typeof configSchema.Type;

export const credentialsSchema = Schema.Struct({
  openai: Schema.optional(Schema.String),
  anthropic: Schema.optional(Schema.String),
  google: Schema.optional(Schema.String),
  githubCopilot: Schema.optional(Schema.String),
});
export type Credentials = typeof credentialsSchema.Type;
