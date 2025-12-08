import { Effect } from "effect";
import { Path } from "@effect/platform";
import {
  CONFIG_DIRECTORY,
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
} from "@/constants.js";
import {
  loadJsonConfig,
  writeJsonFile,
  expandHome,
  ensureDirectory,
} from "@/utils/files.js";
import { ConfigError } from "@/lib/errors.js";
import { configSchema, Config } from "@/schema.js";

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

/**
 * Save config to ~/.config/cmd-sage/cmd-sage.json
 */
const saveConfig = (config: Config) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const configPathRaw = path.join(CONFIG_DIRECTORY, CONFIG_FILENAME);
    const configPath = yield* expandHome(configPathRaw);

    // Ensure directory exists
    const configDir = path.dirname(configPath);
    yield* ensureDirectory(configDir).pipe(
      Effect.mapError(
        (error) =>
          new ConfigError({
            message: "Failed to create config directory",
            cause: error,
          }),
      ),
    );

    // Write config
    yield* writeJsonFile(configPath, config).pipe(
      Effect.mapError(
        (error) =>
          new ConfigError({
            message: "Failed to write config file",
            cause: error,
          }),
      ),
    );

    yield* Effect.log(`Config saved to ${configPath}`);
  });

const configService = Effect.gen(function* () {
  const config = yield* onStartLoadConfig;
  return {
    config: () => Effect.succeed(config),
    saveConfig: (newConfig: Config) => saveConfig(newConfig),
  };
});

export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    effect: configService,
  },
) {}
