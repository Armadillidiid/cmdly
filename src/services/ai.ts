import { generateText } from "ai";
import { Data, Effect } from "effect";
import { explainPrompt, suggestPrompt } from "@/lib/prompts.js";
import { getProvider, type Provider } from "@/lib/providers.js";
import type { Credentials } from "@/types.js";
import { ConfigService } from "./config.js";
import { CredentialsService } from "./credentials.js";

export class AiServiceError extends Data.TaggedError("AiServiceError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

const aiService = Effect.gen(function* () {
	const config = yield* ConfigService;
	const credentials = yield* CredentialsService;

	const configData = yield* config.config();
	const providerName = configData.provider as Provider;
	const model = configData.model;

	// Get API key for the configured provider (map provider name to credential key)
	const credentialKey = providerName as keyof Credentials;
	const apiKey = yield* credentials.getApiKey(credentialKey);

	if (!apiKey) {
		return yield* Effect.fail(
			new AiServiceError({
				message: `No API key found for provider: ${providerName}`,
			}),
		);
	}

	const provider = yield* getProvider(providerName, apiKey);

	const defaultOpts: Parameters<typeof generateText>[0] & {
		maxTokens: number;
	} = {
		model: provider(model),
		maxTokens: 1024,
		messages: [],
	};

	const suggest = (target: string, prompt: string) =>
		Effect.gen(function* () {
			const res = yield* Effect.tryPromise({
				try: () =>
					generateText({
						...defaultOpts,
						system: suggestPrompt(target),
						messages: [{ role: "user", content: prompt }],
					}),
				catch: (err) =>
					new AiServiceError({
						message: "AI suggestion failed",
						cause: err,
					}),
			});
			return res.text;
		});

	const explain = (prompt: string) =>
		Effect.gen(function* () {
			const res = yield* Effect.tryPromise({
				try: () =>
					generateText({
						...defaultOpts,
						system: explainPrompt(),
						messages: [{ role: "user", content: prompt }],
					}),
				catch: (err) =>
					new AiServiceError({
						message: "AI explanation failed",
						cause: err,
					}),
			});
			return res.text;
		});

	return {
		suggest,
		explain,
	};
});

export class AiService extends Effect.Service<AiService>()("AiService", {
	effect: aiService,
	dependencies: [ConfigService.Default, CredentialsService.Default],
}) {}
