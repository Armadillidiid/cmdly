import { Schema } from "effect";

export const configSchema = Schema.Struct({
  model: Schema.String,
  provider: Schema.String,
});
export type Config = typeof configSchema.Type;
