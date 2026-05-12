import { chmodSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const source = join(rootDir, "dist", "linux-x64", "cmdly");
const targetDir = join(rootDir, "bin");
const target = join(targetDir, "cmdly");

mkdirSync(targetDir, { recursive: true });
rmSync(target, { force: true });
copyFileSync(source, target);
chmodSync(target, 0o755);

console.log(`[stage:bin] staged ${source} -> ${target}`);
