import { Effect, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { ModelsFetchError, FileSystemError } from "@/lib/errors.js";
import type { ModelInfo, ModelsDevResponse } from "@/schema.js";
import { modelsDevResponseSchema } from "@/schema.js";
import { STATE_DIRECTORY } from "@/constants.js";
import {
  expandHome,
  ensureDirectory,
  fileExists,
  writeJsonFile,
  readJsonFile,
} from "@/utils/files.js";

const MODELS_CACHE_FILENAME = "models-cache.json";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get the path to the models cache file
 */
const getModelsCachePath = () =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const stateDir = yield* expandHome(STATE_DIRECTORY);
    return path.join(stateDir, MODELS_CACHE_FILENAME);
  });

/**
 * Check if the cache is stale based on file modification time
 */
const isCacheStale = (filePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const info = yield* fs.stat(filePath);

    // mtime is an Option<Date>, extract it or default to epoch
    const mtimeMs = Option.getOrElse(info.mtime, () => new Date(0)).getTime();
    const age = Date.now() - mtimeMs;
    return age > CACHE_MAX_AGE_MS;
  });

/**
 * Fetch models from models.dev API and cache them locally
 *
 * Downloads the complete models.dev API response and stores it in the state directory.
 * The cache is considered fresh for 24 hours.
 *
 * @param force - Force refresh even if cache is fresh
 * @returns Effect containing the complete ModelsDevResponse
 */
export const fetchAndCacheModels = (force = false) =>
  Effect.gen(function* () {
    const cachePath = yield* getModelsCachePath();
    const exists = yield* fileExists(cachePath);

    // Check if we can use existing cache
    if (exists && !force) {
      const stale = yield* isCacheStale(cachePath);
      if (!stale) {
        // Cache is fresh, read from it
        return yield* readJsonFile(cachePath, modelsDevResponseSchema).pipe(
          Effect.mapError(
            (error) =>
              new ModelsFetchError({
                message: "Failed to read cached models",
                cause: error,
              }),
          ),
        );
      }
    }

    // Fetch from API
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch("https://models.dev/api.json").then((r) => {
          if (!r.ok) {
            throw new Error(
              `Failed to fetch models: ${r.status} ${r.statusText}`,
            );
          }
          return r.json();
        }),
      catch: (error) =>
        new ModelsFetchError({
          message: "Failed to fetch models from models.dev",
          cause: error,
        }),
    });

    const data = response as ModelsDevResponse;

    // Ensure state directory exists
    const stateDir = yield* expandHome(STATE_DIRECTORY);
    yield* ensureDirectory(stateDir);

    // Write to cache
    yield* writeJsonFile(cachePath, data);

    return data;
  });

/**
 * Fetch available models for a specific provider from local cache
 *
 * Reads from the cached models.dev response stored locally.
 * If the cache doesn't exist or is stale (>24h old), it will automatically
 * fetch and cache fresh data from models.dev API.
 *
 * @param providerId - The provider ID (e.g., "openai", "anthropic", "google")
 * @returns Effect containing an array of ModelInfo objects
 */
export const fetchProviderModels = (providerId: string) =>
  Effect.gen(function* () {
    // Ensure we have cached data (will fetch if needed)
    const data = yield* fetchAndCacheModels();

    // The data is a record with provider IDs as keys
    const provider = data[providerId];

    if (!provider) {
      return [];
    }

    // Convert the models Record to an array
    return Object.values(provider.models);
  });
