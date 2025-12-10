import { Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { CREDENTIALS_FILENAME, STATE_DIRECTORY } from "@/constants.js";
import { CredentialsError } from "@/lib/errors.js";
import { credentialsSchema } from "@/schema.js";
import type { CredentialValue, CredentialsRecord } from "@/types.js";
import {
	ensureDirectory,
	expandHome,
	loadJsonConfig,
	setFilePermissions,
	writeJsonFile,
} from "@/utils/files.js";
import { GitHubOAuthService } from "./github-oauth.js";

const layers = Layer.mergeAll(GitHubOAuthService.Default);

/**
 * Load credentials from ~/.local/state/${NAME}/credentials.json
 */
const loadCredentials = Effect.gen(function* () {
	const path = yield* Path.Path;
	const credentialsPathRaw = path.join(STATE_DIRECTORY, CREDENTIALS_FILENAME);
	const credentialsPath = yield* expandHome(credentialsPathRaw);

	return yield* loadJsonConfig(credentialsPath, undefined, credentialsSchema, {
		ensurePermissions: 0o600,
	}).pipe(
		Effect.catchTag("FileSystemError", (error) => {
			if (error.operation === "readFile") {
				return Effect.succeed(undefined);
			}
			return Effect.fail(
				new CredentialsError({
					message:
						"Failed to load credentials. Please run 'configure' command if you haven't already.",
					cause: error,
				}),
			);
		}),
	);
});

/**
 * Save credentials to ~/.local/state/${NAME}/credentials.json
 * Maintains strict file permissions (0600)
 */
const saveCredentials = (credentials: CredentialsRecord) =>
	Effect.gen(function* () {
		const path = yield* Path.Path;
		const credentialsPathRaw = path.join(STATE_DIRECTORY, CREDENTIALS_FILENAME);
		const credentialsPath = yield* expandHome(credentialsPathRaw);

		// Ensure directory exists
		const stateDir = path.dirname(credentialsPath);
		yield* ensureDirectory(stateDir).pipe(
			Effect.mapError(
				(error) =>
					new CredentialsError({
						message: "Failed to create state directory",
						cause: error,
					}),
			),
		);

		// Write credentials
		yield* writeJsonFile(credentialsPath, credentials).pipe(
			Effect.mapError(
				(error) =>
					new CredentialsError({
						message: "Failed to write credentials file",
						cause: error,
					}),
			),
		);

		// Ensure strict permissions (0600)
		yield* setFilePermissions(credentialsPath, 0o600).pipe(
			Effect.mapError(
				(error) =>
					new CredentialsError({
						message: "Failed to set credentials file permissions",
						cause: error,
					}),
			),
		);

		yield* Effect.log(`Credentials saved to ${credentialsPath}`);
	});

/**
 * Get API key for a specific provider
 */
const getCredentials = Effect.gen(function* () {
	const credentials = yield* loadCredentials;

	if (!credentials) {
		return yield* Effect.fail(
			new CredentialsError({
				message:
					"No credentials found. Please run 'configure' command to set up your credentials.",
			}),
		);
	}

	return credentials;
});

/**
 * Get credential for a specific provider
 */
const getCredential = (provider: keyof CredentialsRecord) =>
	Effect.gen(function* () {
		const credentials = yield* getCredentials;

		const credential = credentials[provider];
		if (!credential) {
			return yield* Effect.fail(
				new CredentialsError({
					message: `No credentials found for provider: ${provider}. Please run 'configure' command.`,
				}),
			);
		}

		if (
			credential.type === "oauth" &&
			credential.expires &&
			new Date() > new Date(credential.expires) &&
			credential.refresh
		) {
			if (provider === "github-copilot") {
				const githubOAuthService = yield* GitHubOAuthService;
				const { token, tokenExpiry } = yield* githubOAuthService.refreshToken(
					credential.refresh,
				);
				const updatedCredential: CredentialValue = {
					type: "oauth",
					access: token,
					refresh: credential.refresh,
					expires: tokenExpiry,
				};
				yield* setCredential(provider, updatedCredential);
				return updatedCredential;
			}
		}

		return credential;
	});

/**
 * Set credential for a specific provider
 */
const setCredential = (
	provider: keyof CredentialsRecord,
	credential: CredentialValue,
) =>
	Effect.gen(function* () {
		const credentials = yield* loadCredentials;
		const updatedCredentials = {
			...(credentials || {}),
			[provider]: credential,
		};
		yield* saveCredentials(updatedCredentials);
		return updatedCredentials;
	});

const credentialsService = Effect.succeed({
	getCredentials,
	getCrendtial: (provider: keyof CredentialsRecord) => getCredential(provider),
	setCrendential: (
		provider: keyof CredentialsRecord,
		credential: CredentialValue,
	) => setCredential(provider, credential),
	saveCredentials: (newCredentials: CredentialsRecord) =>
		saveCredentials(newCredentials),
}).pipe(Effect.provide(layers));

export class CredentialsService extends Effect.Service<CredentialsService>()(
	"CredentialsService",
	{
		effect: credentialsService,
	},
) {}
