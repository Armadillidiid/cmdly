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

export class UnknownProviderError extends TaggedError("UnknownProviderError")<{
	readonly provider: string;
}> {
	get message() {
		return `Unknown provider: ${this.provider}`;
	}
}

export class MissingApiKeyError extends TaggedError("MissingApiKeyError")<{
	readonly provider: string;
}> {
	get message() {
		return `Missing API key for provider: ${this.provider}`;
	}
}

export class ModelsFetchError extends TaggedError("ModelsFetchError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class ActionError extends TaggedError("ActionError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}
