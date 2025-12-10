import { spawn } from "node:child_process";
import clipboard from "copy-paste";
import { Console, Effect } from "effect";
import { ActionError } from "@/lib/errors.js";
import { AiService } from "@/services/ai.js";
import type { SuggestAction } from "@/types.js";
import { highlightMarkdown } from "@/utils/highlight.js";
import { displayStream } from "@/utils/stream.js";

/**
 * Execute a shell command
 */
export const runCommand = (command: string) =>
	Effect.tryPromise({
		try: () =>
			new Promise<void>((resolve, reject) => {
				const shell = spawn(command, {
					stdio: "inherit",
					shell: true,
				});

				shell.on("close", (code: number | null) => {
					if (code === 0) {
						resolve();
					} else {
						reject(
							new ActionError({
								message: `Command failed with exit code ${code}`,
							}),
						);
					}
				});

				shell.on("error", (err) =>
					reject(
						new ActionError({
							message: "Failed to execute command",
							cause: err,
						}),
					),
				);
			}),
		catch: (err) => {
			if (err instanceof ActionError) {
				return err;
			}
			return new ActionError({
				message: "Failed to execute command",
				cause: err,
			});
		},
	});

/**
 * Copy command to system clipboard
 */
export const copyCommand = (command: string) =>
	Effect.tryPromise({
		try: () =>
			new Promise<void>((resolve, reject) => {
				clipboard.copy(command, (err) => {
					if (err) reject(err);
					else resolve();
				});
			}),
		catch: (err) => {
			return new ActionError({
				message: "Failed to copy to clipboard",
				cause: err,
			});
		},
	});

export const handleAction = (
	action: Exclude<SuggestAction, "revise">,
	command: string,
) =>
	Effect.gen(function* () {
		switch (action) {
			case "run":
				yield* runCommand(command);
				return { shouldContinue: false };

			case "explain": {
				const ai = yield* AiService;
				yield* Console.log("");
				const stream = yield* ai.explain(command);
				yield* displayStream(stream, highlightMarkdown);
				return { shouldContinue: false };
			}

			case "copy":
				yield* copyCommand(command);
				return { shouldContinue: false };

			case "cancel":
				yield* Console.log("\nCancelled.");
				return { shouldContinue: false };
		}
	});
