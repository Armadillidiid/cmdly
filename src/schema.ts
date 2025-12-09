import { Schema } from "effect";
import { SUPPORTED_PROVIDER_IDS } from "./constants.js";
import { Provider } from "./lib/providers.js";

const suggestActionSchema = Schema.Literal(
	"run",
	"revise",
	"explain",
	"copy",
	"cancel",
);

export const configSchema = Schema.Struct({
	model: Schema.String,
	provider: Schema.String,
	defaultSuggestAction: Schema.optional(suggestActionSchema),
});

export type Config = typeof configSchema.Type;
export type SuggestAction = typeof suggestActionSchema.Type;

const credentialsFields = Object.fromEntries(
	SUPPORTED_PROVIDER_IDS.map((id) => [id, Schema.optional(Schema.String)]),
) as Record<Provider, Schema.optional<typeof Schema.String>>;

export const credentialsSchema = Schema.Struct({
	token: Schema.optional(Schema.String),
	...credentialsFields,
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
	input: Schema.optional(Schema.Number),
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
	models: Schema.Record({ key: Schema.String, value: modelInfoSchema }),
});
export type ProviderInfo = typeof providerInfoSchema.Type;

export const modelsDevResponseSchema = Schema.Record({
	key: Schema.String,
	value: providerInfoSchema,
});
export type ModelsDevResponse = typeof modelsDevResponseSchema.Type;
