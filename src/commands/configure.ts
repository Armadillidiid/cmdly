import { Command, Prompt } from "@effect/cli";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Console, Effect, Layer, Redacted } from "effect";
import { bundledThemesInfo, type BundledTheme } from "shiki";
import { NAME, SUPPORTED_PROVIDER_IDS } from "@/constants.js";
import { ConfigService } from "@/services/config.js";
import { CredentialsService } from "@/services/credentials.js";
import type { Credentials } from "@/types.js";
import {
	markCurrentChoice,
	stripCurrentMarker,
} from "@/utils/config.js";
import { fetchAndCacheModels, fetchProviderModels } from "@/utils/models.js";

const configureCommand = Command.make("configure", {}, () =>
	Effect.gen(function* () {
		yield* Console.log(
			"This wizard will help you set up your AI provider credentials and preferences.\n",
		);

		// Load existing config and credentials to use as defaults
		const configService = yield* ConfigService;
		const currentConfig = yield* configService.config();
		const credentialsService = yield* CredentialsService;
		const currentCredentials = yield* credentialsService.getCredentials();

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

		// Get existing API key for this provider if it exists
		const existingApiKey = currentCredentials[provider];

		// Step 2: Get API key
		if (existingApiKey) {
			yield* Console.log(
				`\nExisting API key found. Press Enter to keep it, or enter a new one.\n`,
			);
		}

		const providerTitle = stripCurrentMarker(
			providerChoices.find((p) => p.value === provider)?.title ?? provider,
		);

		const apiKey = yield* Prompt.password({
			message: `Enter your ${providerTitle} API key:`,
			validate: (input) => {
				if (!input || input.trim().length === 0) {
					return Effect.fail("API key cannot be empty");
				}
				return Effect.succeed(input);
			},
			default: existingApiKey || "",
		});

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

		// Step 6: Confirm before saving
		const confirm = yield* Prompt.confirm({
			message: "\nSave these settings?",
			initial: true,
		});

		if (!confirm) {
			yield* Console.log("\nConfiguration cancelled.\n");
			return;
		}

		// Step 7: Save credentials
		const updatedCredentials: Credentials = {
			...currentCredentials,
			[provider]: Redacted.value(apiKey),
		};

		yield* credentialsService.saveCredentials(updatedCredentials);

		// Step 8: Save config
		if (selectedModel) {
			const updatedConfig = {
				model: selectedModel,
				provider: provider,
				theme: selectedTheme,
			};

			yield* configService.saveConfig(updatedConfig);
			yield* Console.log(
				`\n Default model set to: ${selectedModel} (provider: ${provider})`,
			);
		} else {
			// Save theme even if model wasn't selected
			const updatedConfig = {
				...currentConfig,
				theme: selectedTheme,
			};
			yield* configService.saveConfig(updatedConfig);
		}

		yield* Console.log(`✨ Theme set to: ${selectedTheme}`);

		yield* Console.log("\n✅ Configuration saved successfully!\n");
		yield* Console.log(
			`You can now use ${NAME} with your configured provider.\n`,
		);
	}).pipe(
		Effect.provide(
			Layer.mergeAll(
				CredentialsService.Default,
				ConfigService.Default,
				NodeFileSystem.layer,
				NodePath.layer,
			),
		),
	),
);

export { configureCommand };
