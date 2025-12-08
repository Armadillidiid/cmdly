import * as Command from "@effect/cli/Command"

const command = Command.make("cmd-sage")

export const run = Command.run(command, {
  name: "cmd-sage",
  version: "0.0.0"
})
