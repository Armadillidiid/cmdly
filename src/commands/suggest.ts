import { Command, Options, Args } from "@effect/cli";
import { Console, Effect, Layer } from "effect";
import { AiService } from "@/services/ai.js";

const programLayer = Layer.mergeAll(AiService.Default);

const targetChoices = ["shell", "git"] as const;

const target = Options.choice("target", targetChoices).pipe(
  Options.withAlias("t"),
  Options.withDefault(targetChoices[0]),
);

const prompt = Args.text({ name: "prompt" });

const suggestCommand = Command.make(
  "suggest",
  {
    target: target,
    prompt: prompt,
  },
  ({ target, prompt }) =>
    Effect.gen(function* () {
      const ai = yield* AiService;
      const res = yield* ai.suggest(target, prompt);
      yield* Console.log(`AI Suggestion for ${target}:\n${res}`);
    }).pipe(Effect.provide(programLayer)),
);

export { suggestCommand };
