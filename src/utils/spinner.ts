import { Effect, Exit, Fiber, Schedule } from "effect";
import { Terminal } from "@effect/platform";

/**
 * Runs an Effect task with a terminal spinner.
 */
export function withSpinner<A, E, R>(
	message: string,
	task: Effect.Effect<A, E, R>,
) {
	const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
	let frameIndex = 0;

	const spinnerFrame = Effect.gen(function* () {
		const terminal = yield* Terminal.Terminal;
		const frame = frames[frameIndex % frames.length];
		yield* terminal.display(`\r${frame} ${message}`);
		frameIndex++;
	});

	const spinner = spinnerFrame.pipe(
		Effect.repeat(Schedule.spaced("80 millis")),
		Effect.forkDaemon,
	);

	return Effect.gen(function* () {
		const terminal = yield* Terminal.Terminal;
		const spinnerFiber = yield* spinner;

		const result = yield* Effect.exit(task);

		yield* Fiber.interrupt(spinnerFiber);

		if (Exit.isSuccess(result)) {
			yield* terminal.display(`\r✓ ${message}\n`);
			return result.value;
		} else {
			yield* terminal.display(`\r✗ ${message}\n`);
			return yield* Effect.failCause(result.cause);
		}
	});
}
