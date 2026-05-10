import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = resolve(__filename, "..", "..");

const detectTarget = () => {
  if (process.platform === "linux" && process.arch === "x64") {
    return "linux-x64";
  }
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "darwin-arm64";
  }
  return null;
};

const target = detectTarget();

if (!target) {
  throw new Error(
    `Unsupported host ${process.platform}-${process.arch}. Supported: linux-x64, darwin-arm64`,
  );
}

const binary = join(rootDir, "dist-app", target, "cmdly");

if (!existsSync(binary)) {
  throw new Error(`SEA binary not found: ${binary}`);
}

const run = (args) => {
  const result = spawnSync(binary, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(["--help"]);
run(["--version"]);

console.log(`SEA verification passed for ${target}`);
