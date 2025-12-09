#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { Console, Effect, Layer } from "effect";
import { CliService } from "./cli.js";

const layers = Layer.mergeAll(CliService.Default, NodeContext.layer);

Effect.gen(function* () {
	const cli = yield* CliService;
	yield* cli.run(process.argv);
}).pipe(
	Effect.catchTags({
		QuitException: () => Console.log("\n❌ Operation cancelled by user.\n"),
		ConfigError: (error) =>
			Console.error(`\n❌ Configuration error: ${error.message}\n`),
		CredentialsError: (error) =>
			Console.error(`\n❌ Credentials error: ${error.message}\n`),
		UnknownProviderError: (error) =>
			Console.error(
				`\n❌ Unknown provider: ${error.provider}\nRun 'configure' to set up a supported provider.\n`,
			),
		MissingApiKeyError: (error) =>
			Console.error(
				`\n❌ Missing API key for provider: ${error.provider}\nRun 'configure' to set up your API key.\n`,
			),
		ModelsFetchError: (error) =>
			Console.error(
				`\n❌ Failed to fetch models: ${error.message}\nPlease check your internet connection and try again.\n`,
			),
		AiServiceError: (error) =>
			Console.error(`\n❌ AI service error: ${error.message}\n`),
	}),
	Effect.provide(layers),
	NodeRuntime.runMain(),
);
