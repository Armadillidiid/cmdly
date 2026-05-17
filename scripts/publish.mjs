import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "../package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const pkgPath = join(rootDir, "package.json");

const run = (cmd, args, opts) => {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    stdio: "inherit",
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const original = JSON.parse(JSON.stringify(pkg));

original.scripts.postinstall = "node scripts/postinstall.mjs";
writeFileSync(pkgPath, `${JSON.stringify(original, null, "\t")}\n`, "utf8");

run("pnpm", ["build"]);
run("pnpm", ["stage:bin"]);
run("pnpm", ["vitest"]);
run("changeset", ["publish"]);
run("changeset", ["tag"]);
run("git", ["push", "--tags"]);

delete original.scripts.postinstall;
writeFileSync(pkgPath, `${JSON.stringify(original, null, "\t")}\n`, "utf8");
