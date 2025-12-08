import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";

const targetChoices = ["shell", "git"] as const;

const target = Options.choice("target", targetChoices).pipe(
  Options.withAlias("t"),
  Options.withDefault(targetChoices[0]),
);
const shellOut = Options.file("shellOut").pipe(
  Options.withAlias("s"),
  Options.optional,
);

const suggestCommand = Command.make(
  "suggest",
  {
    target: target,
    shellOut: shellOut,
  },
  ({ target, shellOut }) =>
    Effect.sync(() => {
      const shellOutValue = Option.getOrNull(shellOut);
      console.log(`Suggestions for query: ${target} ${shellOutValue}`);
    }),
);

export { suggestCommand };
