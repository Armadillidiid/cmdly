import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const requiredTargets = ["linux-x64", "linux-arm64", "darwin-arm64"];

const missing = requiredTargets.filter(
  (target) => !existsSync(join(rootDir, "dist", target, "cmdly")),
);

if (missing.length > 0) {
  throw new Error(
    `Missing dist binaries for: ${missing.join(", ")}. Expected dist/<target>/cmdly for all targets.`,
  );
}

console.log(`[validate:dist] found binaries for ${requiredTargets.join(", ")}`);
