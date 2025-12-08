import * as os from "node:os";
import { Effect, Schema } from "effect";
import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { FileSystemError } from "@/lib/errors.js";

export const expandHome = (
  filePath: string,
): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* () {
    if (!filePath.startsWith("~/")) {
      return filePath;
    }
    const path = yield* Path.Path;
    return path.join(os.homedir(), filePath.slice(2));
  });

/**
 * Check if a file exists
 */
export const fileExists = (
  filePath: string,
): Effect.Effect<boolean, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.exists(filePath);
  });

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export const ensureDirectory = (
  dir: string,
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.makeDirectory(dir, { recursive: true });
  });

/**
 * Read and parse a JSON file with schema validation
 */
export const readJsonFile = <A, I, R>(
  filePath: string,
  schema: Schema.Schema<A, I, R>,
): Effect.Effect<A, PlatformError | FileSystemError, FileSystem.FileSystem | R> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const content = yield* fs.readFileString(filePath);

    const parsed = yield* Effect.try({
      try: () => JSON.parse(content) as unknown,
      catch: (error) =>
        new FileSystemError({
          message: "Failed to parse JSON",
          operation: "JSON.parse",
          path: filePath,
          cause: error,
        }),
    });

    return yield* Schema.decodeUnknown(schema)(parsed).pipe(
      Effect.mapError(
        (error) =>
          new FileSystemError({
            message: "Failed to validate JSON schema",
            operation: "Schema.decode",
            path: filePath,
            cause: error,
          }),
      ),
    );
  });

/**
 * Write a JSON file with pretty formatting
 */
export const writeJsonFile = (
  filePath: string,
  data: unknown,
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.writeFileString(filePath, JSON.stringify(data, null, 2));
  });

/**
 * Set file permissions (Unix only)
 * @param filePath Path to the file
 * @param mode Numeric mode (e.g., 0o600 for read/write owner only)
 */
export const setFilePermissions = (
  filePath: string,
  mode: number,
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    if (process.platform === "win32") {
      // Skip on Windows
      return;
    }
    const fs = yield* FileSystem.FileSystem;
    yield* fs.chmod(filePath, mode);
  });

/**
 * Check file permissions (Unix only)
 * Returns the file mode or undefined on Windows
 */
export const getFilePermissions = (
  filePath: string,
): Effect.Effect<number | undefined, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    if (process.platform === "win32") {
      return undefined;
    }
    const fs = yield* FileSystem.FileSystem;
    const info = yield* fs.stat(filePath);
    return info.mode & 0o777;
  });

/**
 * Ensure file has specific permissions, fixing if needed
 */
export const ensureFilePermissions = (
  filePath: string,
  expectedMode: number,
): Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const currentMode = yield* getFilePermissions(filePath);
    if (currentMode !== undefined && currentMode !== expectedMode) {
      yield* Effect.log(
        `Warning: File has insecure permissions (${currentMode.toString(8)}), setting to ${expectedMode.toString(8)}...`,
      );
      yield* setFilePermissions(filePath, expectedMode);
    }
  });

/**
 * Load a JSON configuration file with default value and schema validation
 * Creates the file with default value if it doesn't exist
 */
export const loadJsonConfig = <A, I, R>(
  filePath: string,
  defaultValue: A,
  schema: Schema.Schema<A, I, R>,
  options?: {
    ensurePermissions?: number;
    logMessages?: {
      notFound?: string;
      created?: string;
    };
  },
): Effect.Effect<
  A,
  PlatformError | FileSystemError,
  FileSystem.FileSystem | Path.Path | R
> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const expandedPath = yield* expandHome(filePath);
    const exists = yield* fileExists(expandedPath);

    if (!exists) {
      if (options?.logMessages?.notFound) {
        yield* Effect.log(options.logMessages.notFound);
      }

      // Ensure directory exists
      const dir = path.dirname(expandedPath);
      yield* ensureDirectory(dir);

      // Write default config
      yield* writeJsonFile(expandedPath, defaultValue);

      // Set permissions if specified
      if (options?.ensurePermissions !== undefined) {
        yield* setFilePermissions(expandedPath, options.ensurePermissions);
      }

      if (options?.logMessages?.created) {
        yield* Effect.log(options.logMessages.created);
      }

      return defaultValue;
    } else {
      // Check and fix permissions if specified
      if (options?.ensurePermissions !== undefined) {
        yield* ensureFilePermissions(expandedPath, options.ensurePermissions);
      }

      // Read and parse config
      return yield* readJsonFile(expandedPath, schema);
    }
  });

