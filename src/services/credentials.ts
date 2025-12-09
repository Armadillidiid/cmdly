import { Path } from "@effect/platform";
import { Effect } from "effect";
import { CREDENTIALS_FILENAME, STATE_DIRECTORY } from "@/constants.js";
import { CredentialsError } from "@/lib/errors.js";
import { credentialsSchema } from "@/schema.js";
import { type Credentials } from "@/types.js";
import {
	ensureDirectory,
	expandHome,
	loadJsonConfig,
	setFilePermissions,
	writeJsonFile,
} from "@/utils/files.js";

const DEFAULT_CREDENTIALS: Credentials = {};

/**
 * Load credentials from ~/.local/state/${NAME}/credentials.json
 * Creates the file with empty credentials if it doesn't exist
 * Sets file permissions to 0600 (read/write for owner only) for security
 */
const loadCredentials = Effect.gen(function* () {
	const path = yield* Path.Path;
	const credentialsPath = path.join(STATE_DIRECTORY, CREDENTIALS_FILENAME);

	return yield* loadJsonConfig(
		credentialsPath,
		DEFAULT_CREDENTIALS,
		credentialsSchema,
		{
			ensurePermissions: 0o600,
			logMessages: {
				notFound: `Credentials file not found at ${credentialsPath}, creating empty credentials file...`,
				created: `Empty credentials file created at ${credentialsPath}`,
			},
		},
	).pipe(
		Effect.mapError(
			(error) =>
				new CredentialsError({
					message: "Failed to load credentials",
					cause: error,
				}),
		),
	);
});

/**
 * Save credentials to ~/.local/state/${NAME}/credentials.json
 * Maintains strict file permissions (0600)
 */
const saveCredentials = (credentials: Credentials) =>
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
const getApiKey = (provider: keyof Credentials) =>
	Effect.gen(function* () {
		const credentials = yield* loadCredentials;
		return credentials[provider];
	});

/**
 * Set API key for a specific provider
 */
const setApiKey = (provider: keyof Credentials, apiKey: string) =>
	Effect.gen(function* () {
		const credentials = yield* loadCredentials;
		const updatedCredentials = { ...credentials, [provider]: apiKey };
		yield* saveCredentials(updatedCredentials);
		return updatedCredentials;
	});

const credentialsService = Effect.gen(function* () {
	const credentials = yield* loadCredentials;

	return {
		getCredentials: () => Effect.succeed(credentials),
		getApiKey: (provider: keyof Credentials) => getApiKey(provider),
		setApiKey: (provider: keyof Credentials, apiKey: string) =>
			setApiKey(provider, apiKey),
		saveCredentials: (newCredentials: Credentials) =>
			saveCredentials(newCredentials),
	};
});

export class CredentialsService extends Effect.Service<CredentialsService>()(
	"CredentialsService",
	{
		effect: credentialsService,
	},
) {}
