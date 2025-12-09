import { Prompt } from "@effect/cli";
import { Console, Effect } from "effect";
import { AiService } from "@/services/ai.js";
import type { SuggestAction } from "@/types.js";
import { spawn } from "node:child_process";

/**
 * Execute a shell command
 */
export const runCommand = (command: string) =>
	Effect.gen(function* () {
		yield* Console.log(`\n🚀 Running: ${command}\n`);

		yield* Effect.tryPromise({
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
							reject(new Error(`Command failed with code ${code}`));
						}
					});

					shell.on("error", reject);
				}),
			catch: (err) => {
				return new Error(`Failed to execute command: ${err}`);
			},
		});
	});

/**
 * Copy command to system clipboard
 */
export const copyCommand = (command: string) =>
	Effect.gen(function* () {
		// Try to use system clipboard
		const clipboardCommands = [
			{ cmd: "pbcopy", platform: "darwin" }, // macOS
			{ cmd: "xclip -selection clipboard", platform: "linux" }, // Linux with xclip
			{ cmd: "xsel --clipboard --input", platform: "linux" }, // Linux with xsel
			{ cmd: "wl-copy", platform: "linux" }, // Wayland
		];

		let copied = false;

		for (const { cmd } of clipboardCommands) {
			const result = yield* Effect.tryPromise({
				try: () =>
					new Promise<boolean>((resolve) => {
						const proc = spawn(cmd, { shell: true });
						proc.stdin.write(command);
						proc.stdin.end();
						proc.on("close", (code: number | null) => resolve(code === 0));
						proc.on("error", () => resolve(false));
					}),
				catch: (err) => {
					return new Error(`Failed to execute command: ${err}`);
				},
			});

			if (result) {
				copied = true;
				break;
			}
		}

		if (copied) {
			yield* Console.log(`\n📋 Copied to clipboard: ${command}\n`);
		} else {
			yield* Console.log(
				`\n!  Could not copy to clipboard. Command:\n\n${command}\n`,
			);
		}
	});

/**
 * Handle the selected action for a suggested command
 * Returns [shouldContinue, newCommand?]
 */
export const handleAction = (
	action: SuggestAction,
	command: string,
	target: string,
	originalPrompt: string,
) =>
	Effect.gen(function* () {
		switch (action) {
			case "run":
				yield* runCommand(command);
				return [false, undefined] as [boolean, string | undefined];

			case "revise": {
				const revision = yield* Prompt.text({
					message: "How would you like to revise the command?",
					validate: (input: string) => {
						if (!input || input.trim().length === 0) {
							return Effect.fail("Revision prompt cannot be empty");
						}
						return Effect.succeed(input);
					},
				});

				const ai = yield* AiService;
				const revisedCommand = yield* ai.suggest(
					target,
					`${originalPrompt}. ${revision}. Previous command was: ${command}`,
				);
				yield* Console.log(`\n${revisedCommand}\n`);
				return [true, revisedCommand] as [boolean, string | undefined];
			}

			case "explain": {
				const ai = yield* AiService;
				const explanation = yield* ai.explain(command);
				yield* Console.log(`\n${explanation}\n`);
				return [true, undefined] as [boolean, string | undefined];
			}

			case "copy":
				yield* copyCommand(command);
				return [false, undefined] as [boolean, string | undefined];

			case "cancel":
				yield* Console.log("\n❌ Cancelled.\n");
				return [false, undefined] as [boolean, string | undefined];
		}
	});
