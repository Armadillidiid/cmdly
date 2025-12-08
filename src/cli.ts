import * as Command from "@effect/cli/Command";
import { Effect } from "effect";

declare const __VERSION__: string;
const VERSION: string =
  typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0-dev";

const mainCommand = Command.make("cmd-sage", {}, () =>
  Effect.sync(() => {
    console.log(
      `cmd-sage v${VERSION}. run cmd-sage --help for more information.`,
    );
  }),
);
// .pipe(
//   Command.withSubcommands([])
// );

const cliService = Effect.gen(function* () {
  return {
    run: (argv: string[]) =>
      Command.run(mainCommand, {
        name: "cmd-sage",
        version: VERSION,
      })(argv),
  };
});

export class CliService extends Effect.Service<CliService>()("CliService", {
  effect: cliService,
}) {}
