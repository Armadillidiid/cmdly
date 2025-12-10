import { Console, Effect, Schedule, Schema } from "effect";
import { GitHubOAuthError } from "@/lib/errors.js";

/**
 * GitHub OAuth Client ID for GitHub Copilot
 */
const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98";

/**
 * User-Agent headers matching GitHub Copilot VSCode extension
 */
const COPILOT_HEADERS = {
	"User-Agent": "GitHubCopilotChat/0.35.0",
	"Editor-Version": "vscode/1.105.1",
	"Editor-Plugin-Version": "copilot-chat/0.32.4",
};

/**
 * GitHub OAuth Device Code Flow endpoints
 */
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const VERIFICATION_URL = "https://github.com/login/device";
const COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token";

/**
 * Response from GitHub's device code endpoint
 */
const DeviceCodeResponseSchema = Schema.Struct({
	device_code: Schema.String,
	user_code: Schema.String,
	verification_uri: Schema.String,
	expires_in: Schema.Number,
	interval: Schema.Number,
});

type DeviceCodeResponse = typeof DeviceCodeResponseSchema.Type;

/**
 * Response from GitHub's access token endpoint
 */
const AccessTokenResponseSchema = Schema.Struct({
	access_token: Schema.String,
	token_type: Schema.String,
	scope: Schema.String,
});

/**
 * Error response from GitHub's access token endpoint
 */
const ErrorResponseSchema = Schema.Struct({
	error: Schema.String,
	error_description: Schema.optional(Schema.String),
	error_uri: Schema.optional(Schema.String),
});

/**
 * Response from GitHub's Copilot token endpoint
 */
const CopilotTokenResponseSchema = Schema.Struct({
	token: Schema.String,
	expires_at: Schema.Number,
	refresh_in: Schema.optional(Schema.Number),
});

type CopilotTokenResponse = typeof CopilotTokenResponseSchema.Type;

/**
 * Initiate the GitHub Device Code Flow
 * Requests device and user verification codes from GitHub
 */
const initiateDeviceFlow = Effect.gen(function* () {
	const response = yield* Effect.tryPromise({
		try: () =>
			globalThis
				.fetch(DEVICE_CODE_URL, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						...COPILOT_HEADERS,
					},
					body: JSON.stringify({
						client_id: GITHUB_CLIENT_ID,
						scope: "read:user",
					}),
				})
				.then((r: Response) => r.json()),
		catch: (error) =>
			new GitHubOAuthError({
				message: `Failed to request device code: ${error}`,
				cause: error,
			}),
	});

	return yield* Schema.decodeUnknown(DeviceCodeResponseSchema)(response);
});

/**
 * Poll GitHub for the access token
 * Waits for user to authorize the device in their browser
 */
const pollForAccessToken = (
	deviceCode: string,
	interval: number,
): Effect.Effect<string, GitHubOAuthError> =>
	Effect.gen(function* () {
		const response = yield* Effect.tryPromise({
			try: () =>
				globalThis
					.fetch(ACCESS_TOKEN_URL, {
						method: "POST",
						headers: {
							Accept: "application/json",
							"Content-Type": "application/json",
							...COPILOT_HEADERS,
						},
						body: JSON.stringify({
							client_id: GITHUB_CLIENT_ID,
							device_code: deviceCode,
							grant_type: "urn:ietf:params:oauth:grant-type:device_code",
						}),
					})
					.then((r: Response) => r.json()),
			catch: (error) =>
				new GitHubOAuthError({
					message: `Failed to poll for access token: ${error}`,
					cause: error,
				}),
		});

		// Try to decode as error response first
		const errorResult =
			Schema.decodeUnknownOption(ErrorResponseSchema)(response);
		if (errorResult._tag === "Some") {
			const error = errorResult.value;

			if (error.error === "authorization_pending") {
				// User hasn't authorized yet, retry
				return yield* Effect.fail(
					new GitHubOAuthError({ message: "authorization_pending" }),
				);
			}

			if (error.error === "slow_down") {
				// Hit rate limit, need to slow down
				return yield* Effect.fail(
					new GitHubOAuthError({ message: "slow_down" }),
				);
			}

			if (error.error === "expired_token") {
				return yield* Effect.fail(
					new GitHubOAuthError({
						message:
							"Authentication expired. Please run the configure command again.",
					}),
				);
			}

			if (error.error === "access_denied") {
				return yield* Effect.fail(
					new GitHubOAuthError({
						message: "Access denied. You cancelled the authorization.",
					}),
				);
			}

			// Other errors
			return yield* Effect.fail(
				new GitHubOAuthError({
					message:
						error.error_description || error.error || "Unknown error occurred",
				}),
			);
		}

		// Try to decode as success response
		const tokenResult = yield* Schema.decodeUnknown(AccessTokenResponseSchema)(
			response,
		).pipe(
			Effect.mapError(
				(error) =>
					new GitHubOAuthError({
						message: "Failed to decode access token response",
						cause: error,
					}),
			),
		);
		return tokenResult.access_token;
	}).pipe(
		Effect.retry(
			Schedule.spaced(`${interval} seconds`).pipe(
				Schedule.whileInput(
					(error: GitHubOAuthError) =>
						error.message === "authorization_pending",
				),
			),
		),
	);

/**
 * Retrieve the Copilot-specific token using the GitHub OAuth access token
 * This is the final step that exchanges the OAuth token for a Copilot token
 *
 * Based on the official OpenCode Copilot auth plugin implementation
 */
const getCopilotToken = (
	githubAccessToken: string,
): Effect.Effect<CopilotTokenResponse, GitHubOAuthError> =>
	Effect.gen(function* () {
		yield* Console.log("Retrieving Copilot token...\n");

		const response = yield* Effect.tryPromise({
			try: () =>
				globalThis
					.fetch(COPILOT_TOKEN_URL, {
						method: "GET",
						headers: {
							Accept: "application/json",
							Authorization: `Bearer ${githubAccessToken}`,
							...COPILOT_HEADERS,
						},
					})
					.then((r: Response) => {
						if (!r.ok) {
							throw new Error(
								`Failed to get Copilot token: ${r.status} ${r.statusText}`,
							);
						}
						return r.json();
					}),
			catch: (error) =>
				new GitHubOAuthError({
					message: `Failed to retrieve Copilot token: ${error}`,
					cause: error,
				}),
		});

		const copilotTokenResult = yield* Schema.decodeUnknown(
			CopilotTokenResponseSchema,
		)(response).pipe(
			Effect.mapError(
				(error) =>
					new GitHubOAuthError({
						message: "Failed to decode Copilot token response",
						cause: error,
					}),
			),
		);

		return copilotTokenResult;
	});

/**
 * Refresh the Copilot token using the GitHub OAuth refresh token
 * Should be called when the access token expires
 */
const refreshCopilotToken = (
	refreshToken: string,
): Effect.Effect<
	{ token: string; tokenExpiry: number },
	GitHubOAuthError
> =>
	Effect.gen(function* () {
		const copilotTokenData = yield* getCopilotToken(refreshToken);

		return {
			token: copilotTokenData.token,
			tokenExpiry: copilotTokenData.expires_at * 1000, // Convert to milliseconds
		};
	});

/**
 * Authenticate with GitHub using the Device Code Flow
 * Returns OAuth refresh token and Copilot access token with expiry
 */
const authenticateWithGitHub = Effect.gen(function* () {
	yield* Console.log(
		"\n🔐 GitHub Copilot requires device-based authentication.\n",
	);

	// Step 1: Get device code
	yield* Console.log("Requesting device code from GitHub...\n");
	const deviceCodeResponse: DeviceCodeResponse = yield* initiateDeviceFlow;

	// Step 2: Display instructions to user
	yield* Console.log("Please follow these steps to authenticate:\n");
	yield* Console.log(
		`1. Visit: ${deviceCodeResponse.verification_uri || VERIFICATION_URL}`,
	);
	yield* Console.log(`2. Enter this code: ${deviceCodeResponse.user_code}\n`);
	yield* Console.log("Waiting for authorization...\n");

	// Step 3: Poll for GitHub OAuth access token (this becomes our refresh token)
	const githubRefreshToken = yield* pollForAccessToken(
		deviceCodeResponse.device_code,
		deviceCodeResponse.interval,
	).pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				yield* Console.error(`\n❌ ${error.message}\n`);
				return yield* Effect.fail(error);
			}),
		),
	);

	yield* Console.log("✅ Authorization successful!\n");

	// Step 4: Exchange GitHub OAuth token for Copilot token
	const copilotTokenData = yield* getCopilotToken(githubRefreshToken);

	yield* Console.log("✅ Copilot token retrieved!\n");

	return {
		refreshToken: githubRefreshToken,
		token: copilotTokenData.token,
		tokenExpiry: copilotTokenData.expires_at * 1000, // Convert to milliseconds
	};
});

const githubOAuthService = Effect.succeed({
	authenticate: authenticateWithGitHub,
	refreshToken: refreshCopilotToken,
});

export class GitHubOAuthService extends Effect.Service<GitHubOAuthService>()(
	"GitHubOAuthService",
	{
		effect: githubOAuthService,
	},
) {}
