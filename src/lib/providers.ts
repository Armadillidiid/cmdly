import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Effect } from "effect";
import { MissingApiKeyError, UnknownProviderError } from "./errors.js";
import { SUPPORTED_PROVIDER_IDS } from "@/constants.js";

export type ProviderId = (typeof SUPPORTED_PROVIDER_IDS)[number];
export type Provider = ProviderId | (string & {});

export const getProvider = (providerName: Provider, apiKey?: string) =>
	Effect.gen(function* () {
		if (!apiKey) {
			return yield* Effect.fail(
				new MissingApiKeyError({ provider: providerName }),
			);
		}

		switch (providerName) {
			case "openai":
				return createOpenAI({ apiKey });
			case "anthropic":
				return createAnthropic({ apiKey });
			case "google":
				return createGoogleGenerativeAI({ apiKey });
			case "github-models":
				return createOpenAICompatible({
					name: "github",
					apiKey: apiKey,
					baseURL: "https://models.github.ai/inference",
				});
			default:
				return yield* Effect.fail(
					new UnknownProviderError({ provider: providerName }),
				);
		}
	});
