import { Prompt } from "@effect/cli";
import { Console, Effect } from "effect";
import type { ModelMessage } from "ai";
import { AiService } from "@/services/ai.js";

/**
 * Run the revision flow: prompt user, call AI, and return updated messages
 */
export const reviseCommand = (
  _command: string,
  messages: ModelMessage[],
  target: string,
) =>
  Effect.gen(function* () {
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
    const newMessages: ModelMessage[] = [
      ...messages,
      { role: "user", content: revision },
    ];
    const revisedCommand = yield* ai.suggest(target, newMessages);
    yield* Console.log(`\n${revisedCommand}\n`);

    return {
      shouldContinue: true,
      messages: [
        ...newMessages,
        { role: "assistant", content: revisedCommand },
      ] satisfies ModelMessage[],
    };
  });
