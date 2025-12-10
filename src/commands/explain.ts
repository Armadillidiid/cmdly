import { Args, Command, Prompt } from "@effect/cli";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Console, Effect, Layer, Option } from "effect";
import { AiService } from "@/services/ai.js";
import { ConfigService } from "@/services/config.js";
import { CredentialsService } from "@/services/credentials.js";
import { GitHubOAuthService } from "@/services/github-oauth.js";
import { highlightMarkdown } from "@/utils/highlight.js";
import { displayStream } from "@/utils/stream.js";

const programLayer = Layer.mergeAll(
	GitHubOAuthService.Default,
	CredentialsService.Default,
	ConfigService.Default,
	AiService.Default,
	NodeFileSystem.layer,
	NodePath.layer,
);

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
			yield* Console.log(""); // Print newline before streaming

			// Get the stream from AI service
			const stream = yield* ai.explain(userCommand);

			// Display the stream with highlighting
			yield* displayStream(stream, highlightMarkdown);

			yield* Console.log(""); // Print newline after streaming
		}).pipe(Effect.provide(programLayer)),
);

export { explainCommand };
