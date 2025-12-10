import { Terminal } from "@effect/platform";
import { Effect } from "effect";
import { StreamError } from "@/lib/errors.js";

/**
 * Consumes a text stream and displays it in real-time
 */
export const displayStream = <R>(
	stream: { textStream: AsyncIterable<string>; fullText: Promise<string> },
	highlighter: (text: string) => Effect.Effect<string, never, R>,
) =>
	Effect.gen(function* () {
		const terminal = yield* Terminal.Terminal;

		// Consume the stream and display in real-time
		const streamData = yield* Effect.tryPromise({
			try: async () => {
				let accumulated = "";
				let linesWritten = 0;

				for await (const chunk of stream.textStream) {
					accumulated += chunk;
					// Count newlines to track how many lines we've written
					linesWritten += (chunk.match(/\n/g) || []).length;
					// Display chunk immediately for real-time feedback
					// @ts-expect-error - process is available in Node.js runtime
					globalThis.process.stdout.write(chunk);
				}

				return { text: accumulated, lines: linesWritten };
			},
			catch: (error) =>
				new StreamError({
					message: "Failed to consume text stream",
					cause: error,
				}),
		});

		// Apply syntax highlighting
		const highlighted = yield* highlighter(streamData.text);

		// Clear all lines that were written during streaming
		// Move cursor up and clear each line
		let clearCommands = "";
		for (let i = 0; i < streamData.lines; i++) {
			clearCommands += "\x1b[1A\x1b[K"; // Move up one line and clear it
		}
		// Clear the current line too
		clearCommands += "\r\x1b[K";

		// Display clear commands + highlighted version
		yield* terminal.display(`${clearCommands}${highlighted}`);

		return streamData.text;
	});
