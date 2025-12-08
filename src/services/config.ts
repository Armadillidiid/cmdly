import { Effect } from "effect";
import { Path } from "@effect/platform";
import {
  CONFIG_DIRECTORY,
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
} from "@/constants.js";
import { loadJsonConfig } from "@/utils/files.js";
import { ConfigError } from "@/lib/errors.js";
import { configSchema } from "@/schema.js";

const onStartLoadConfig = Effect.gen(function* () {
  const path = yield* Path.Path;
  const configPath = path.join(CONFIG_DIRECTORY, CONFIG_FILENAME);

  return yield* loadJsonConfig(configPath, DEFAULT_CONFIG, configSchema, {
    logMessages: {
      notFound: `Config file not found at ${configPath}, creating default config...`,
      created: `Default config created at ${configPath}`,
    },
  }).pipe(
    Effect.mapError(
      (error) =>
        new ConfigError({
          message: "Failed to load config",
          cause: error,
        }),
    ),
  );
});

const configService = Effect.gen(function* () {
  const config = yield* onStartLoadConfig;
  return {
    config: () => Effect.succeed(config),
  };
});

export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    effect: configService,
  },
) {}
