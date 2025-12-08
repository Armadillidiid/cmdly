import { Command, Options, Args } from "@effect/cli";
import { Console, Effect, Layer, Option } from "effect";
import { AiService } from "@/services/ai.js";

const programLayer = Layer.mergeAll(AiService.Default);

const targetChoices = ["shell", "git"] as const;

const target = Options.choice("target", targetChoices).pipe(
  Options.withAlias("t"),
  Options.withDefault(targetChoices[0]),
);
const shellOut = Options.file("shellOut").pipe(
  Options.withAlias("s"),
  Options.optional,
);

const prompt = Args.text({ name: "prompt" });

const suggestCommand = Command.make(
  "suggest",
  {
    target: target,
    shellOut: shellOut,
    prompt: prompt,
  },
  ({ target, shellOut, prompt }) =>
    Effect.gen(function* () {
      const shellOutValue = Option.getOrNull(shellOut);
      const ai = yield* AiService;
      const res = yield* ai.suggest(target, prompt);
      yield* Console.log(`AI Suggestion for ${target}:\n${res}`);
    }).pipe(Effect.provide(programLayer)),
);

export { suggestCommand };
