import { FileSystem, Path } from "@effect/platform";
import { Effect, Option, Schema } from "effect";
import {
	MODELS_CACHE_MAX_AGE_MS,
	MODELS_CACHE_FILENAME,
	STATE_DIRECTORY,
} from "@/constants.js";
import { ModelsFetchError } from "@/lib/errors.js";
import { modelsDevResponseSchema } from "@/schema.js";
import {
	ensureDirectory,
	expandHome,
	fileExists,
	readJsonFile,
	writeJsonFile,
} from "@/utils/files.js";

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
		return age > MODELS_CACHE_MAX_AGE_MS;
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
						throw new ModelsFetchError({
							message: `Failed to fetch models: ${r.status} ${r.statusText}`,
						});
					}

					return r.json();
				}),
			catch: (error) =>
				new ModelsFetchError({
					message: "Failed to fetch models from models.dev",
					cause: error,
				}),
		});

		// Decode and validate the response using the schema
		const data = yield* Schema.decodeUnknown(modelsDevResponseSchema)(
			response,
		).pipe(
			Effect.mapError(
				(error) =>
					new ModelsFetchError({
						message: "Failed to parse models API response",
						cause: error,
					}),
			),
		);

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
		const data = yield* fetchAndCacheModels();

		const provider = data[providerId];

		if (!provider) {
			return [];
		}

		return Object.values(provider.models);
	});
