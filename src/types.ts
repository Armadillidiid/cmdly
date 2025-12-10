import type { SUPPORTED_PROVIDER_IDS } from "./constants.js";
import type {
	configSchema,
	credentialsSchema,
	modelInfoSchema,
	modelsDevResponseSchema,
	providerInfoSchema,
	suggestActionSchema,
} from "./schema.js";

export type Config = typeof configSchema.Type;
export type SuggestAction = typeof suggestActionSchema.Type;
export type Credentials = typeof credentialsSchema.Type;
export type CredentialsRecord = Exclude<Credentials, undefined>;
export type CredentialValue = CredentialsRecord[keyof CredentialsRecord];
export type ModelInfo = typeof modelInfoSchema.Type;
export type ProviderInfo = typeof providerInfoSchema.Type;
export type ModelsDevResponse = typeof modelsDevResponseSchema.Type;
export type ProviderId = (typeof SUPPORTED_PROVIDER_IDS)[number];
