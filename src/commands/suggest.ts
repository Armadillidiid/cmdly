import { Args, Command, Options, Prompt } from "@effect/cli";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { ModelMessage } from "ai";
import { Console, Effect, Layer, Option } from "effect";
import { SUGGEST_ACTION_CHOICES } from "@/constants.js";
import { AiService } from "@/services/ai.js";
import { ConfigService } from "@/services/config.js";
import { CredentialsService } from "@/services/credentials.js";
import { GitHubOAuthService } from "@/services/github-oauth.js";
import type { SuggestAction } from "@/types.js";
import { handleAction } from "@/utils/actions.js";
import { highlightShell } from "@/utils/highlight.js";
import { displayStream } from "@/utils/stream.js";

const programLayer = Layer.mergeAll(
	GitHubOAuthService.Default,
	CredentialsService.Default,
	ConfigService.Default,
	AiService.Default,
	NodeFileSystem.layer,
	NodePath.layer,
);

const targetChoices = ["shell", "git"] as const;

const target = Options.choice("target", targetChoices).pipe(
	Options.withAlias("t"),
	Options.withDefault(targetChoices[0]),
);

const prompt = Args.optional(Args.text({ name: "prompt" }));

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
						validate: validateNonEmpty,
					}),
				onSome: (p) => Effect.succeed(p),
			});

			const ai = yield* AiService;
			const initialMessages: ModelMessage[] = [
				{ role: "user", content: userPrompt },
			];
			const initialCommand = yield* getSuggestAndLog(
				ai,
				target,
				initialMessages,
			);

			// Get default action from config
			const configService = yield* ConfigService;
			const config = yield* configService.config();
			const defaultAction = config?.default_suggest_action;

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
									choices: SUGGEST_ACTION_CHOICES,
								});

						// Handle revision inline as it's part of the conversation loop
						if (action === "revise") {
							const revision = yield* Prompt.text({
								message: "How would you like to revise the command?",
								validate: validateNonEmpty,
							});

							const newMessages: ModelMessage[] = [
								...state.messages,
								{ role: "user", content: revision },
							];
							const revisedCommand = yield* getSuggestAndLog(
								ai,
								target,
								newMessages,
							);

							return {
								messages: [
									...state.messages,
									{ role: "user", content: revision },
									{ role: "assistant", content: revisedCommand },
								],
								shouldContinue: true,
							};
						}

						const result = yield* handleAction(
							action,
							getLastCommand(state.messages),
						);

						return {
							messages: state.messages,
							shouldContinue: result.shouldContinue,
						};
					}),
			});
		}).pipe(Effect.provide(programLayer)),
);

const validateNonEmpty = (input: string) => {
	if (!input || input.trim().length === 0) {
		return Effect.fail("Prompt cannot be empty");
	}
	return Effect.succeed(input);
};

const getSuggestAndLog = (
	ai: AiService,
	target: string,
	messages: ModelMessage[],
) =>
	Effect.gen(function* () {
		// Print newline before streaming starts
		yield* Console.log("");

		// Get the stream from AI service
		const stream = yield* ai.suggest(target, messages);

		// Display the stream with highlighting
		const command = yield* displayStream(stream, highlightShell);

		// Print newline after streaming ends
		yield* Console.log("");
		return command;
	});

const getLastCommand = (messages: ModelMessage[]): string => {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg && msg.role === "assistant" && typeof msg.content === "string") {
			return msg.content;
		}
	}
	return "";
};

export { suggestCommand };
