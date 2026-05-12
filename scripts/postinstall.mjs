#!/usr/bin/env node

import {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	renameSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const binDir = join(packageRoot, "bin");
const binPath = join(binDir, "cmdly");
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

const installBinary = (sourcePath) => {
	if (!existsSync(sourcePath)) {
		throw new Error(`missing target binary in package: ${sourcePath}`);
	}

	mkdirSync(binDir, { recursive: true });
	const tempTarget = join(binDir, ".cmdly.tmp");
	copyFileSync(sourcePath, tempTarget);
	chmodSync(tempTarget, 0o755);
	renameSync(tempTarget, binPath);
};

const main = () => {
	const target = detectTarget();

	if (!target) {
		console.warn(
			`[postinstall] skipping unsupported target ${process.platform}-${process.arch}; supported: ${supportedTargets.join(", ")}`,
		);
		return;
	}

	if (target === "linux-x64" && existsSync(binPath)) {
		// The binary is already included in the package and bin field points to it
		// No postinstall setup needed
		console.log(
			`[postinstall] skipping install for ${target} since binary already exists`,
		);
		return;
	}

	const sourcePath = join(packageRoot, "dist", target, "cmdly");
	installBinary(sourcePath);

	console.log(`[postinstall] installed ${target} binary`);
};

try {
	main();
} catch (error) {
	console.warn(
		`[postinstall] native install failed: ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(0);
}
