import { Command, Prompt } from "@effect/cli";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Console, Effect, Layer, Redacted } from "effect";
import { type BundledTheme, bundledThemesInfo } from "shiki";
import { SUGGEST_ACTION_CHOICES, SUPPORTED_PROVIDER_IDS } from "@/constants.js";
import { ConfigService } from "@/services/config.js";
import { CredentialsService } from "@/services/credentials.js";
import { GitHubOAuthService } from "@/services/github-oauth.js";
import type { Credentials, CredentialValue } from "@/types.js";
import { markCurrentChoice, stripCurrentMarker } from "@/utils/config.js";
import { fetchAndCacheModels, fetchProviderModels } from "@/utils/models.js";

const layers = Layer.mergeAll(
	GitHubOAuthService.Default,
	CredentialsService.Default,
	ConfigService.Default,
	NodeFileSystem.layer,
	NodePath.layer,
);

const configureCommand = Command.make("configure", {}, () =>
	Effect.gen(function* () {
		yield* Console.log(
			"This wizard will help you set up your credentials and preferences.\n",
		);

		// Load existing config and credentials to use as defaults
		const configService = yield* ConfigService;
		const currentConfig = yield* configService.config();
		const credentialsService = yield* CredentialsService;
		const currentCredentials = yield* credentialsService.getCredentials.pipe(
			Effect.catchTag("CredentialsError", () => Effect.succeed(undefined)),
		);

		const modelsData = yield* fetchAndCacheModels();
		const providerChoices = markCurrentChoice(
			SUPPORTED_PROVIDER_IDS.map((id) => ({
				title: modelsData[id]?.name || id,
				value: id,
			})),
			currentConfig?.provider,
		);

		// Step 1: Select provider
		const provider = yield* Prompt.select({
			message: "Select your AI provider:",
			choices: providerChoices,
		});

		// Get existing credentials for this provider if it exists
		const existingCredential =
			currentCredentials?.[provider as keyof typeof currentCredentials];

		let credential: CredentialValue;

		// Step 2: Handle authentication based on provider
		if (provider === "github-copilot") {
			// Use GitHub Device Flow for Copilot
			yield* Console.log(
				"\nGitHub Copilot requires device-based authentication instead of an API key.\n",
			);

			const githubOAuthService = yield* GitHubOAuthService;

			// Check if user already has OAuth credentials
			if (existingCredential?.type === "oauth") {
				const shouldReauth = yield* Prompt.confirm({
					message: "You already have an access token. Re-authenticate?",
					initial: false,
				});

				if (shouldReauth) {
					const authResult = yield* githubOAuthService.authenticate;
					credential = {
						type: "oauth" as const,
						access: authResult.token,
						refresh: authResult.refreshToken,
						expires: authResult.tokenExpiry,
					};
				} else {
					credential = existingCredential;
				}
			} else {
				const authResult = yield* githubOAuthService.authenticate;
				credential = {
					type: "oauth" as const,
					access: authResult.token,
					refresh: authResult.refreshToken,
					expires: authResult.tokenExpiry,
				};
			}
		} else {
			// Standard API key input for other providers
			const existingApiKey =
				existingCredential?.type === "apiKey"
					? existingCredential.access
					: undefined;

			if (existingApiKey) {
				yield* Console.log(
					`\nExisting API key found. Press Enter to keep it, or enter a new one.\n`,
				);
			}

			const providerTitle = stripCurrentMarker(
				providerChoices.find((p) => p.value === provider)?.title ?? provider,
			);

			const redactedApiKey = yield* Prompt.password({
				message: `Enter your ${providerTitle} API key:`,
				validate: (input) => {
					if (!input || input.trim().length === 0) {
						return Effect.fail("API key cannot be empty");
					}
					return Effect.succeed(input);
				},
				default: existingApiKey || "",
			});

			const apiKey = Redacted.value(redactedApiKey) as string;
			credential = {
				type: "apiKey" as const,
				access: apiKey,
			};
		}

		// Step 3: Fetch available models for the provider
		yield* Console.log(`\nFetching available models for ${provider}...\n`);

		const models = yield* fetchProviderModels(provider).pipe(
			Effect.catchAll((error) => {
				// If fetching models fails, continue without model selection
				return Effect.gen(function* () {
					yield* Console.error(`!  Failed to fetch models: ${error.message}`);
					yield* Console.log(
						"Continuing with configuration. You can set the default model manually later.\n",
					);
					return [];
				});
			}),
		);

		let selectedModel: string | undefined;

		if (models.length > 0) {
			// Step 4: Select default model
			const modelChoices = markCurrentChoice(
				models.map((model) => ({
					title: `${model.name} (${model.id})`,
					value: model.id,
				})),
				currentConfig?.model,
				() => currentConfig?.provider === provider,
			);

			selectedModel = yield* Prompt.select({
				message: "Select your default model:",
				choices: modelChoices,
			});
		}

		// Step 5: Select theme
		const themeChoices = markCurrentChoice(
			bundledThemesInfo.map((theme) => ({
				title: theme.displayName,
				value: theme.id as BundledTheme,
			})),
			currentConfig?.theme,
		);

		const selectedTheme = yield* Prompt.select({
			message: "Select your syntax highlighting theme:",
			choices: themeChoices,
		});

		// Step 6: Select default suggest action
		const actionChoices = markCurrentChoice(
			SUGGEST_ACTION_CHOICES,
			currentConfig?.default_suggest_action,
		);

		const selectedAction = yield* Prompt.select({
			message: "Select default action for suggest command",
			choices: [
				{ title: "Always prompt me", value: undefined },
				...actionChoices,
			],
		});

		// Step 7: Confirm before saving
		const confirm = yield* Prompt.confirm({
			message: "\nSave these settings?",
			initial: true,
		});

		if (!confirm) {
			yield* Console.log("\nConfiguration cancelled.\n");
			return;
		}

		// Step 8: Save credentials
		const updatedCredentials: Credentials = {
			...currentCredentials,
			[provider]: credential,
		};

		yield* credentialsService.saveCredentials(updatedCredentials);

		// Step 9: Save config
		if (selectedModel) {
			const updatedConfig = {
				model: selectedModel,
				provider: provider,
				theme: selectedTheme,
				default_suggest_action: selectedAction,
			};

			yield* configService.saveConfig(updatedConfig);
		} else {
			// Save theme even if model wasn't selected
			const updatedConfig = {
				...currentConfig,
				theme: selectedTheme,
				default_suggest_action: selectedAction,
			};
			yield* configService.saveConfig(updatedConfig);
		}

		yield* Console.log("\nConfiguration saved!\n");
	}).pipe(Effect.provide(layers)),
);

export { configureCommand };
