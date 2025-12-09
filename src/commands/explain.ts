import { Args, Command, Prompt } from "@effect/cli";
import { Console, Effect, Layer, Option } from "effect";
import { AiService } from "@/services/ai.js";
import { highlightMarkdown } from "@/utils/highlight.js";

const programLayer = Layer.mergeAll(AiService.Default);

const command = Args.optional(Args.text({ name: "command" }));

const explainCommand = Command.make(
	"explain",
	{
		command: command,
	},
	({ command }) =>
		Effect.gen(function* () {
			const userCommand = yield* Option.match(command, {
				onNone: () =>
					Prompt.text({
						message: "Enter the command you want to explain:",
						validate: (input) => {
							if (!input || input.trim().length === 0) {
								return Effect.fail("Command cannot be empty");
							}
							return Effect.succeed(input);
						},
					}),
				onSome: (cmd) => Effect.succeed(cmd),
			});

			const ai = yield* AiService;
			const explanation = yield* ai.explain(userCommand);
			const highlighted = yield* highlightMarkdown(explanation);
			yield* Console.log(highlighted);
		}).pipe(Effect.provide(programLayer)),
);

export { explainCommand };
