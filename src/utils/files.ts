import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { Effect } from "effect";
import { ConfigError } from "@/lib/errors.js";

export const expandHome = (filePath: string): string =>
  filePath.startsWith("~/")
    ? path.join(os.homedir(), filePath.slice(2))
    : filePath;

export const directoryExists = (dir: string) =>
  Effect.try({
    try: () => fs.existsSync(dir) && fs.statSync(dir).isDirectory(),
    catch: (error) =>
      new ConfigError({
        message: "Failed to check directory",
        cause: error,
      }),
  });

export const ensureDirectory = (dir: string) =>
  Effect.try({
    try: () => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    },
    catch: (error) =>
      new ConfigError({
        message: "Failed to create directory",
        cause: error,
      }),
  });
