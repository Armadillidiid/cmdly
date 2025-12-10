import { codeToANSI } from "@shikijs/cli";
import { Effect } from "effect";
import { ConfigService } from "@/services/config.js";

/**
 * Highlights shell command using shiki
 */
export const highlightShell = (command: string) =>
	Effect.gen(function* () {
		const configService = yield* ConfigService;
		const config = yield* configService.config();
		const theme = config?.theme || "github-dark-default";
		return yield* Effect.promise(() => codeToANSI(command, "sh", theme));
	});

/**
 * Highlights markdown using shiki
 */
export const highlightMarkdown = (markdown: string) =>
	Effect.gen(function* () {
		const configService = yield* ConfigService;
		const config = yield* configService.config();
		const theme = config?.theme || "github-dark-default";
		return yield* Effect.promise(() => codeToANSI(markdown, "markdown", theme));
	});
