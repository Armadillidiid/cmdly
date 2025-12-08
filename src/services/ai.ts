import { Effect } from "effect";
import { generateText } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { explainPrompt, suggestPrompt } from "@/lib/prompts.js";

const aiService = Effect.gen(function* () {
  const openAi = createOpenAI({
    apiKey:
      process.env.OPENAI_API_KEY ??
      "",
  });

  const defaultOpts: Parameters<typeof generateText>[0] & {
    maxTokens: number;
  } = {
    model: openAi("gpt-4o-mini"),
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
        catch: (err) => new Error(`AI suggestion failed: ${String(err)}`),
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
        catch: (err) => new Error(`AI explanation failed: ${String(err)}`),
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
}) {}
