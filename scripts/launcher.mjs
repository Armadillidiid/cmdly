#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const nativeBinary = join(packageRoot, "dist", "native", "cmdly");
const supportedTargets = ["linux-x64", "linux-arm64", "darwin-arm64"];

const detectTarget = () => {
  if (process.platform === "linux" && process.arch === "x64") {
    return "linux-x64";
  }
  if (process.platform === "linux" && process.arch === "arm64") {
    return "linux-arm64";
  }
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "darwin-arm64";
  }
  return null;
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const target = detectTarget();

if (!target) {
  fail(
    [
      `cmdly: unsupported platform ${process.platform}-${process.arch}.`,
      `Supported targets: ${supportedTargets.join(", ")}.`,
      "Download manually: https://github.com/Armadillidiid/cmdly/releases/latest",
    ].join("\n"),
  );
}

if (!existsSync(nativeBinary)) {
  fail(
    [
      `cmdly: native binary missing for ${target}.`,
      "Likely causes: install scripts disabled (--ignore-scripts), offline install, or postinstall download failed.",
      "Try: npm rebuild cmdly",
      "Or reinstall without --ignore-scripts.",
      "Releases: https://github.com/Armadillidiid/cmdly/releases/latest",
    ].join("\n"),
  );
}

const result = spawnSync(nativeBinary, process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  fail(`cmdly: failed to start native binary: ${result.error.message}`);
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
