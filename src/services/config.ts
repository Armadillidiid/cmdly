import { Effect, Schema } from "effect";
import {
  CONFIG_DIRECTORY,
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
} from "@/constants.js";
import * as path from "path";
import { expandHome } from "@/utils/files.js";
import * as fs from "node:fs";
import { ConfigError } from "@/lib/errors.js";
import { configSchema } from "@/schema.js";

const onStartLoadConfig = Effect.gen(function* () {
  const configPath = expandHome(path.join(CONFIG_DIRECTORY, CONFIG_FILENAME));

  // Check if config file exists
  const exists = yield* Effect.tryPromise({
    try: async () => {
      try {
        await fs.promises.access(configPath, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    },
    catch: (error) =>
      new ConfigError({
        message: "Failed to check config file existence",
        cause: error,
      }),
  });

  if (!exists) {
    yield* Effect.log(
      `Config file not found at ${configPath}, creating default config...`,
    );

    // Ensure directory exists
    const configDir = path.dirname(configPath);
    yield* Effect.tryPromise({
      try: () => fs.promises.mkdir(configDir, { recursive: true }),
      catch: (error) =>
        new ConfigError({
          message: "Failed to create config directory",
          cause: error,
        }),
    });

    // Write default config
    yield* Effect.tryPromise({
      try: () =>
        fs.promises.writeFile(
          configPath,
          JSON.stringify(DEFAULT_CONFIG, null, 2),
          "utf-8",
        ),
      catch: (error) =>
        new ConfigError({
          message: "Failed to create default config",
          cause: error,
        }),
    });

    yield* Effect.log(`Default config created at ${configPath}`);
    return DEFAULT_CONFIG;
  } else {
    // Read and parse config file
    const configContent = yield* Effect.tryPromise({
      try: () => fs.promises.readFile(configPath, "utf-8"),
      catch: (error) =>
        new ConfigError({
          message: "Failed to read config file",
          cause: error,
        }),
    });

    return yield* Effect.try({
      try: () => JSON.parse(configContent),
      catch: (error) =>
        new ConfigError({
          message: "Failed to parse config file",
          cause: error,
        }),
    }).pipe(Effect.flatMap(Schema.decode(configSchema)));
  }
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
