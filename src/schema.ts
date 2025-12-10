import { Schema } from "effect";
import { BundledTheme, bundledThemesInfo } from "shiki";
import { SUGGEST_ACTIONS, SUPPORTED_PROVIDER_IDS } from "./constants.js";

export const suggestActionSchema = Schema.Literal(
	...Object.values(SUGGEST_ACTIONS),
);

export const configSchema = Schema.Struct({
	model: Schema.String,
	provider: Schema.String,
	default_suggest_action: Schema.optional(suggestActionSchema),
	theme: Schema.optional(
		Schema.Literal(
			...(bundledThemesInfo.map((theme) => theme.id) as BundledTheme[]),
		),
	),
});

const credentialValueSchema = Schema.Struct({
	type: Schema.Union(Schema.Literal("apiKey"), Schema.Literal("oauth")),
	refresh: Schema.optional(Schema.String),
	access: Schema.String,
	expires: Schema.optional(Schema.Number),
});

export const credentialsSchema = Schema.UndefinedOr(
	Schema.partial(
		Schema.Struct({
			[SUPPORTED_PROVIDER_IDS[0]]: credentialValueSchema,
			[SUPPORTED_PROVIDER_IDS[1]]: credentialValueSchema,
			[SUPPORTED_PROVIDER_IDS[2]]: credentialValueSchema,
			[SUPPORTED_PROVIDER_IDS[3]]: credentialValueSchema,
			[SUPPORTED_PROVIDER_IDS[4]]: credentialValueSchema,
		}),
	),
);

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
export const providerInfoSchema = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	npm: Schema.String,
	env: Schema.Array(Schema.String),
	doc: Schema.String,
	api: Schema.optional(Schema.String),
	models: Schema.Record({ key: Schema.String, value: modelInfoSchema }),
});
export const modelsDevResponseSchema = Schema.Record({
	key: Schema.String,
	value: providerInfoSchema,
});
