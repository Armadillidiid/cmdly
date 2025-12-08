#!/usr/bin/env node

import { execFileSync } from "child_process";
import pkg from "../package.json" with { type: "json" };
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const isWatch = process.argv.includes("--watch");

// Build pkgroll arguments
const args = [
  isWatch ? "--watch" : null,
  !isWatch ? "--minify" : null,
  `--define.__VERSION__='"${pkg.version}"'`,
  `--define.__NAME__='"${pkg.name}"'`,
].filter(Boolean) as string[];

// Run pkgroll
try {
  execFileSync("pnpm", ["exec", "pkgroll", ...args], {
    stdio: "inherit",
    cwd: rootDir,
  });
} catch (error) {
  process.exit(1);
}
