#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "../package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const isWatch = process.argv.includes("--watch");

// Build pkgroll arguments
const args = [
	isWatch ? "--watch" : null,
	isWatch ? "--sourcemap" : null,
	!isWatch ? "--minify" : null,
	`--define.__VERSION__="${pkg.version}"`,
	`--define.__NAME__="${pkg.name}"`,
].filter(Boolean) as string[];

// Run pkgroll
try {
	execFileSync("pnpm", ["exec", "pkgroll", ...args], {
		stdio: "inherit",
		cwd: rootDir,
	});
} catch (_error) {
	process.exit(1);
}
