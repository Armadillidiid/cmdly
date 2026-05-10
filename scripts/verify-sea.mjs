import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = resolve(__filename, "..", "..");

const targets = ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"];
const excludedTargets = new Map([
  [
    "darwin-x64",
    "Node SEA on Intel macOS is currently unstable (upstream issue); excluding target.",
  ],
]);

const enabledTargets = targets.filter((target) => {
  const reason = excludedTargets.get(target);
  if (!reason) {
    return true;
  }
  console.warn(`[verify:sea] Excluding ${target}: ${reason}`);
  return false;
});

const detectTarget = () => {
  if (process.platform === "linux" && process.arch === "arm64") {
    return "linux-arm64";
  }
  if (process.platform === "linux" && process.arch === "x64") {
    return "linux-x64";
  }
  if (process.platform === "darwin" && process.arch === "x64") {
    return "darwin-x64";
  }
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "darwin-arm64";
  }
  return null;
};

const target = detectTarget();

if (!target) {
  throw new Error(
    `Unsupported host ${process.platform}-${process.arch}. Configured targets: ${targets.join(", ")}.`,
  );
}

if (!enabledTargets.includes(target)) {
  const reason = excludedTargets.get(target) ?? "Excluded target.";
  throw new Error(`Host target ${target} is excluded. ${reason}`);
}

const binary = join(rootDir, "dist", target, "cmdly");

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
