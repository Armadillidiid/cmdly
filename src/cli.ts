import { Command } from "@effect/cli";
import { Effect } from "effect";
import { NAME, VERSION } from "./constants.js";

const mainCommand = Command.make(NAME, {}, () =>
  Effect.sync(() => {
    console.log(
      `${NAME} v${VERSION}. run ${NAME} --help for more information.`,
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
        name: NAME,
        version: VERSION,
      })(argv),
  };
});

export class CliService extends Effect.Service<CliService>()("CliService", {
  effect: cliService,
}) {}
