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

const npmVersion = getNpmVersion();
const original = JSON.parse(JSON.stringify(pkg));
const savedPackageManager = pkg.packageManager;
const savedDevEnginesPackageManager = JSON.parse(
  JSON.stringify(pkg.devEngines?.packageManager),
);
const savedPrepack = pkg.scripts?.prepack;

// Step 1: inject postinstall only, keep pnpm as packageManager for pnpm commands
original.scripts.postinstall = "node scripts/postinstall.mjs";
writeFileSync(pkgPath, `${JSON.stringify(original, null, "\t")}\n`, "utf8");

run("pnpm", ["build"]);
run("pnpm", ["stage:bin"]);
run("pnpm", ["vitest", "--run"]);

// Step 2: remove prepack (uses pnpm which won't work with npm packageManager)
// and switch to npm for changeset publish (it only supports npm)
delete original.scripts.prepack;
original.packageManager = `npm@${npmVersion}`;
if (original.devEngines) {
  original.devEngines.packageManager = {
    name: "npm",
    version: npmVersion,
  };
}
writeFileSync(pkgPath, `${JSON.stringify(original, null, "\t")}\n`, "utf8");

run("changeset", ["publish"]);
run("changeset", ["tag"]);
run("git", ["push", "--tags"]);

// Step 3: restore pnpm
delete original.scripts.postinstall;
if (savedPrepack) {
  original.scripts.prepack = savedPrepack;
}
original.packageManager = savedPackageManager;
if (original.devEngines) {
  original.devEngines.packageManager = savedDevEnginesPackageManager;
}
writeFileSync(pkgPath, `${JSON.stringify(original, null, "\t")}\n`, "utf8");
