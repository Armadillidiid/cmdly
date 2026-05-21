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

const getNpmVersion = () => {
  const result = spawnSync("npm", ["--version"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.stdout.trim();
};

// @changesets/cli currently only supports npm so we need to temporarily change our package manager
const npmVersion = getNpmVersion();
const original = JSON.parse(JSON.stringify(pkg));
const savedPackageManager = pkg.packageManager;
const savedDevEnginesPackageManager = JSON.parse(
  JSON.stringify(pkg.devEngines?.packageManager),
);

original.scripts.postinstall = "node scripts/postinstall.mjs";
original.packageManager = `npm@${npmVersion}`;
if (original.devEngines) {
  original.devEngines.packageManager = {
    name: "npm",
    version: npmVersion,
  };
}
writeFileSync(pkgPath, `${JSON.stringify(original, null, "\t")}\n`, "utf8");

run("pnpm", ["build"]);
run("pnpm", ["stage:bin"]);
run("pnpm", ["vitest"]);
run("changeset", ["publish"]);
run("changeset", ["tag"]);
run("git", ["push", "--tags"]);

delete original.scripts.postinstall;
original.packageManager = savedPackageManager;
if (original.devEngines) {
  original.devEngines.packageManager = savedDevEnginesPackageManager;
}
writeFileSync(pkgPath, `${JSON.stringify(original, null, "\t")}\n`, "utf8");
