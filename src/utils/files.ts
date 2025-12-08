import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { Effect, Schema } from "effect";
import { FileSystemError } from "@/lib/errors.js";

export const expandHome = (filePath: string): string =>
  filePath.startsWith("~/")
    ? path.join(os.homedir(), filePath.slice(2))
    : filePath;

/**
 * Check if a file exists
 */
export const fileExists = (filePath: string) =>
  Effect.tryPromise({
    try: async () => {
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    },
    catch: (error) =>
      new FileSystemError({
        message: "Failed to check file existence",
        operation: "access",
        path: filePath,
        cause: error,
      }),
  });

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export const ensureDirectory = (dir: string) =>
  Effect.tryPromise({
    try: () => fs.promises.mkdir(dir, { recursive: true }),
    catch: (error) =>
      new FileSystemError({
        message: "Failed to create directory",
        operation: "mkdir",
        path: dir,
        cause: error,
      }),
  });

/**
 * Read and parse a JSON file with schema validation
 */
export const readJsonFile = <A, I, R>(
  filePath: string,
  schema: Schema.Schema<A, I, R>,
) =>
  Effect.gen(function* () {
    const content = yield* Effect.tryPromise({
      try: () => fs.promises.readFile(filePath, "utf-8"),
      catch: (error) =>
        new FileSystemError({
          message: "Failed to read file",
          operation: "readFile",
          path: filePath,
          cause: error,
        }),
    });

    const parsed = yield* Effect.try({
      try: () => JSON.parse(content),
      catch: (error) =>
        new FileSystemError({
          message: "Failed to parse JSON",
          operation: "JSON.parse",
          path: filePath,
          cause: error,
        }),
    });

    return yield* Schema.decode(schema)(parsed);
  });

/**
 * Write a JSON file with pretty formatting
 */
export const writeJsonFile = (filePath: string, data: unknown) =>
  Effect.tryPromise({
    try: () =>
      fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8"),
    catch: (error) =>
      new FileSystemError({
        message: "Failed to write file",
        operation: "writeFile",
        path: filePath,
        cause: error,
      }),
  });

/**
 * Set file permissions (Unix only)
 * @param filePath Path to the file
 * @param mode Numeric mode (e.g., 0o600 for read/write owner only)
 */
export const setFilePermissions = (filePath: string, mode: number) =>
  Effect.gen(function* () {
    if (process.platform === "win32") {
      // Skip on Windows
      return;
    }
    yield* Effect.tryPromise({
      try: () => fs.promises.chmod(filePath, mode),
      catch: (error) =>
        new FileSystemError({
          message: "Failed to set file permissions",
          operation: "chmod",
          path: filePath,
          cause: error,
        }),
    });
  });

/**
 * Check file permissions (Unix only)
 * Returns the file mode or undefined on Windows
 */
export const getFilePermissions = (filePath: string) =>
  Effect.gen(function* () {
    if (process.platform === "win32") {
      return undefined;
    }
    const stats = yield* Effect.tryPromise({
      try: () => fs.promises.stat(filePath),
      catch: (error) =>
        new FileSystemError({
          message: "Failed to get file stats",
          operation: "stat",
          path: filePath,
          cause: error,
        }),
    });
    return stats.mode & 0o777;
  });

/**
 * Ensure file has specific permissions, fixing if needed
 */
export const ensureFilePermissions = (
  filePath: string,
  expectedMode: number,
) =>
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
) =>
  Effect.gen(function* () {
    const expandedPath = expandHome(filePath);
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
