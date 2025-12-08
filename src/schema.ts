import { Schema } from "effect";

export const configSchema = Schema.Struct({
  model: Schema.String,
  provider: Schema.String,
});
export type Config = typeof configSchema.Type;

export const credentialsSchema = Schema.Struct({
  token: Schema.optional(Schema.String),
  openai: Schema.optional(Schema.String),
  anthropic: Schema.optional(Schema.String),
  google: Schema.optional(Schema.String),
  "github-models": Schema.optional(Schema.String),
});
export type Credentials = typeof credentialsSchema.Type;

// Models.dev API schemas
export const modelCostSchema = Schema.Struct({
  input: Schema.optional(Schema.Number),
  output: Schema.optional(Schema.Number),
  reasoning: Schema.optional(Schema.Number),
  cache_read: Schema.optional(Schema.Number),
  cache_write: Schema.optional(Schema.Number),
  input_audio: Schema.optional(Schema.Number),
  output_audio: Schema.optional(Schema.Number),
});

export const modelLimitSchema = Schema.Struct({
  context: Schema.Number,
  input: Schema.Number,
  output: Schema.Number,
});

export const modelModalitiesSchema = Schema.Struct({
  input: Schema.Array(Schema.String),
  output: Schema.Array(Schema.String),
});

export const modelStatusSchema = Schema.Literal("alpha", "beta", "deprecated");

export const modelInfoSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  attachment: Schema.Boolean,
  reasoning: Schema.Boolean,
  tool_call: Schema.Boolean,
  structured_output: Schema.optional(Schema.Boolean),
  temperature: Schema.optional(Schema.Boolean),
  knowledge: Schema.optional(Schema.String),
  release_date: Schema.String,
  last_updated: Schema.String,
  open_weights: Schema.Boolean,
  cost: Schema.optional(modelCostSchema),
  limit: modelLimitSchema,
  modalities: modelModalitiesSchema,
  status: Schema.optional(modelStatusSchema),
});
export type ModelInfo = typeof modelInfoSchema.Type;

export const providerInfoSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  npm: Schema.String,
  env: Schema.Array(Schema.String),
  doc: Schema.String,
  api: Schema.optional(Schema.String),
  models: Schema.Array(modelInfoSchema),
});
export type ProviderInfo = typeof providerInfoSchema.Type;

export const modelsDevResponseSchema = Schema.Struct({
  providers: Schema.Array(providerInfoSchema),
});
export type ModelsDevResponse = typeof modelsDevResponseSchema.Type;
