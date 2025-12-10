#!/usr/bin/env node

import { NodeContext, NodeRuntime, NodeTerminal } from "@effect/platform-node";
import { Cause, Console, Effect, Exit, Layer } from "effect";
import { CliService } from "./cli.js";
import { GitHubOAuthService } from "./services/github-oauth.js";

const layers = Layer.mergeAll(
	NodeContext.layer,
	NodeTerminal.layer,
	GitHubOAuthService.Default,
	CliService.Default,
);

Effect.gen(function* () {
	const cli = yield* CliService;
	yield* cli.run(process.argv);
}).pipe(
	Effect.catchTags({
		QuitException: () => Console.log("\nOperation cancelled by user.\n"),
		ConfigError: (error) =>
			Console.error(`\nConfiguration error: ${error.message}\n`),
		CredentialsError: (error) =>
			Console.error(`\nCredentials error: ${error.message}\n`),
		UnknownProviderError: (error) =>
			Console.error(
				`\nUnknown provider: ${error.provider}\nRun 'configure' to set up a supported provider.\n`,
			),
		MissingApiKeyError: (error) =>
			Console.error(
				`\nMissing API key for provider: ${error.provider}\nRun 'configure' to set up your API key.\n`,
			),
		ModelsFetchError: (error) =>
			Console.error(
				`\nFailed to fetch models: ${error.message}\nPlease check your internet connection and try again.\n`,
			),
		AiServiceError: (error) =>
			Console.error(`\nAI service error: ${error.message}\n`),
		ActionError: (error) => Console.error(`\nAction error: ${error.message}\n`),
		StreamError: (error) => Console.error(`\nStream error: ${error.message}\n`),
		GitHubOAuthError: (error) =>
			Console.error(`\nGitHub OAuth error: ${error.message}\n`),
	}),
	Effect.provide(layers),
	NodeRuntime.runMain({
		teardown: (exit) => {
			// Force exit: copy-paste library spawns child processes (pbcopy/xclip/clip),
			// which keeps Node's event loop alive even after the command completes successfully
			const code =
				Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause) ? 1 : 0;
			process.exit(code);
		},
	}),
);
