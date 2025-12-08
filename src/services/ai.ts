import { Effect } from "effect";
import { generateText } from "ai";
import { githubProvider } from "@/lib/providers.js";
import { explainPrompt, suggestPrompt } from "@/lib/prompts.js";

const aiService = Effect.gen(function* () {
  const defaultOpts: Parameters<typeof generateText>[0] & {
    maxTokens: number;
  } = {
    model: githubProvider("gpt-4o-mini"),
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
