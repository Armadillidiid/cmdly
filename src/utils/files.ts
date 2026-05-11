import * as os from "node:os";
import { FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Schema } from "effect";
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
): Effect.Effect<
	A,
	PlatformError | FileSystemError,
	FileSystem.FileSystem | R
> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const content = yield* fs.readFileString(filePath);

		const parsed = yield* Schema.decodeUnknown(Schema.parseJson())(content).pipe(
			Effect.mapError(
				(error) =>
					new FileSystemError({
						message: "Failed to parse JSON",
						operation: "Schema.parseJson",
						path: filePath,
						cause: error,
					}),
			),
		);

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
	mode = 0o644,
): Effect.Effect<void, PlatformError | FileSystemError, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const json = yield* Schema.encode(Schema.parseJson())(data).pipe(
			Effect.mapError(
				(error) =>
					new FileSystemError({
						message: "Failed to stringify JSON",
						operation: "Schema.encode(parseJson)",
						path: filePath,
						cause: error,
					}),
			),
		);
		yield* fs.writeFileString(filePath, json);
		yield* setFilePermissions(filePath, mode);
	}).pipe(
		Effect.mapError(
			(error) =>
				new FileSystemError({
					message: "Failed to write JSON file",
					operation: "writeJsonFile",
					path: filePath,
					cause: error,
				}),
		),
	);

/**
 * Set file permissions (Unix only)
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
			yield* setFilePermissions(filePath, expectedMode);
		}
	});

/**
 * Read and validate a JSON config file
 */
export const readJsonConfig = <A, I, R>(
	filePath: string,
	schema: Schema.Schema<A, I, R>,
) =>
	Effect.gen(function* () {
		const expandedPath = yield* expandHome(filePath);
		const exists = yield* fileExists(expandedPath);

		if (!exists) {
			return undefined;
		}

		yield* ensureFilePermissions(expandedPath, 0o600);

		return yield* readJsonFile(expandedPath, schema);
	});
