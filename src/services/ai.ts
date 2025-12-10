import { type ModelMessage, streamText } from "ai";
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
	const apiKey = yield* credentials.getCrendtial(credentialKey);

	if (!apiKey) {
		return yield* Effect.fail(
			new AiServiceError({
				message: `No API key found for provider: ${providerName}`,
			}),
		);
	}

	const provider = yield* getProvider(providerName, apiKey.access);

	const defaultOpts: Parameters<typeof streamText>[0] & {
		maxTokens: number;
	} = {
		model: provider(model),
		maxTokens: 1024,
		messages: [],
	};

	const suggest = (target: string, messages: ModelMessage[]) =>
		Effect.sync(() => {
			// Start streaming - streamText returns synchronously
			const result = streamText({
				...defaultOpts,
				system: suggestPrompt(target),
				messages,
			});

			return {
				textStream: result.textStream,
				fullText: result.text,
			};
		});

	const explain = (prompt: string) =>
		Effect.sync(() => {
			// Start streaming - streamText returns synchronously
			const result = streamText({
				...defaultOpts,
				system: explainPrompt(),
				messages: [{ role: "user", content: prompt }],
			});

			return {
				textStream: result.textStream,
				fullText: result.text,
			};
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
