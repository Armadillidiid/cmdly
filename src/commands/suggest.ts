import { Args, Command, Options, Prompt } from "@effect/cli";
import { Console, Effect, Layer, Option } from "effect";
import type { ModelMessage } from "ai";
import { AiService } from "@/services/ai.js";
import { ConfigService } from "@/services/config.js";
import type { SuggestAction } from "@/types.js";
import { handleAction } from "@/utils/actions.js";

const programLayer = Layer.mergeAll(AiService.Default, ConfigService.Default);

const targetChoices = ["shell", "git"] as const;

const target = Options.choice("target", targetChoices).pipe(
	Options.withAlias("t"),
	Options.withDefault(targetChoices[0]),
);

const prompt = Args.optional(Args.text({ name: "prompt" }));

const actionChoices = [
	{ title: "Run", value: "run" as const },
	{ title: "Revise", value: "revise" as const },
	{ title: "Explain", value: "explain" as const },
	{ title: "Copy", value: "copy" as const },
	{ title: "Cancel", value: "cancel" as const },
];

/**
 * Get the last assistant message content from the message history
 */
const getLastCommand = (messages: ModelMessage[]): string => {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg && msg.role === "assistant" && typeof msg.content === "string") {
			return msg.content;
		}
	}
	return "";
};

const suggestCommand = Command.make(
	"suggest",
	{
		target: target,
		prompt: prompt,
	},
	({ target, prompt }: { target: string; prompt: Option.Option<string> }) =>
		Effect.gen(function* () {
			const userPrompt = yield* Option.match(prompt, {
				onNone: () =>
					Prompt.text({
						message: `What ${target} command would you like?`,
						validate: (input) => {
							if (!input || input.trim().length === 0) {
								return Effect.fail("Prompt cannot be empty");
							}
							return Effect.succeed(input);
						},
					}),
				onSome: (p) => Effect.succeed(p),
			});

			const ai = yield* AiService;
			const initialMessages: ModelMessage[] = [
				{ role: "user", content: userPrompt },
			];
			const initialCommand = yield* ai.suggest(target, initialMessages);
			yield* Console.log(`\n${initialCommand}\n`);

			// Get default action from config
			const configService = yield* ConfigService;
			const config = yield* configService.config();
			const defaultAction = config?.defaultSuggestAction;

			const initialState: {
				messages: ModelMessage[];
				shouldContinue: boolean;
			} = {
				messages: [
					...initialMessages,
					{ role: "assistant", content: initialCommand },
				],
				shouldContinue: true,
			};

			yield* Effect.iterate(initialState, {
				while: (state) => state.shouldContinue,
				body: (state) =>
					Effect.gen(function* () {
						const action: SuggestAction = defaultAction
							? defaultAction
							: yield* Prompt.select({
									message: "What would you like to do?",
									choices: actionChoices,
								});

						const result = yield* handleAction(
							action,
							getLastCommand(state.messages),
							state.messages,
							target,
						);

						const newMessages: ModelMessage[] =
							result.messages ?? state.messages;

						return {
							messages: newMessages,
							shouldContinue: result.shouldContinue,
						};
					}),
			});
		}).pipe(Effect.provide(programLayer)),
);

export { suggestCommand };
