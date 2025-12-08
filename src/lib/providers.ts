import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Effect } from "effect";
import { MissingApiKeyError, UnknownProviderError } from "./errors.js";

export type Provider =
  | "openai"
  | "anthropic"
  | "google"
  | "github"
  | (string & {});

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
      case "github":
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

export const getDefaultModel = (
  providerName: Provider,
): Effect.Effect<string, UnknownProviderError> =>
  Effect.gen(function* () {
    switch (providerName) {
      case "openai":
        return "gpt-4o-mini";
      case "anthropic":
        return "claude-3-5-sonnet-20241022";
      case "google":
        return "gemini-2.0-flash-exp";
      case "github":
        return "gpt-4o";
      default:
        return yield* Effect.fail(
          new UnknownProviderError({ provider: providerName }),
        );
    }
  });


