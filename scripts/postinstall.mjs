#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import pkg from "../package.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const binDir = join(packageRoot, "bin");
const binPath = join(binDir, "cmdly");
const supportedTargets = ["linux-x64", "linux-arm64", "darwin-arm64"];
const releaseBaseUrl =
  process.env.CMDLY_DOWNLOAD_BASE_URL ??
  `https://github.com/Armadillidiid/cmdly/releases/download/v${pkg.version}`;

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

const downloadToFile = async (url, filePath) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": `cmdly-installer/${pkg.version}`,
      accept: "application/octet-stream,text/plain",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`download failed (${response.status}) for ${url}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));
};

const checksumForFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const parseSha256File = (content) => {
  const line = content.trim().split(/\r?\n/)[0] ?? "";
  const [sum] = line.trim().split(/\s+/);
  if (!sum) {
    throw new Error("invalid checksum file");
  }
  return sum.toLowerCase();
};

const installBinary = (archivePath, binaryName) => {
  const tempRoot = join(tmpdir(), `cmdly-install-${Date.now()}`);
  mkdirSync(tempRoot, { recursive: true });

  const extractResult = spawnSync("tar", ["-xzf", archivePath, "-C", tempRoot], {
    stdio: "pipe",
  });

  if (extractResult.status !== 0) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw new Error(
      `failed to extract archive: ${extractResult.stderr?.toString("utf8") ?? "unknown error"}`,
    );
  }

  const extractedBinary = join(tempRoot, binaryName);
  if (!existsSync(extractedBinary)) {
    rmSync(tempRoot, { recursive: true, force: true });
    throw new Error(`archive did not contain expected binary: ${binaryName}`);
  }

  mkdirSync(binDir, { recursive: true });
  const tempTarget = join(binDir, ".cmdly.tmp");
  copyFileSync(extractedBinary, tempTarget);
  chmodSync(tempTarget, 0o755);
  renameSync(tempTarget, binPath);

  rmSync(tempRoot, { recursive: true, force: true });
};

const main = async () => {
  const target = detectTarget();

  if (!target) {
    console.warn(
      `[postinstall] skipping unsupported target ${process.platform}-${process.arch}; supported: ${supportedTargets.join(", ")}`,
    );
    return;
  }

  if (target === "linux-x64" && existsSync(binPath)) {
    return;
  }

  const assetName = `cmdly-v${pkg.version}-${target}.tar.gz`;
  const checksumName = `${assetName}.sha256`;
  const archiveUrl = `${releaseBaseUrl}/${assetName}`;
  const checksumUrl = `${releaseBaseUrl}/${checksumName}`;

  const tempRoot = join(tmpdir(), `cmdly-download-${Date.now()}`);
  mkdirSync(tempRoot, { recursive: true });
  const archivePath = join(tempRoot, assetName);
  const checksumPath = join(tempRoot, checksumName);

  try {
    await downloadToFile(archiveUrl, archivePath);
    await downloadToFile(checksumUrl, checksumPath);

    const expected = parseSha256File(readFileSync(checksumPath, "utf8"));
    const actual = await checksumForFile(archivePath);
    if (expected !== actual) {
      throw new Error(`checksum mismatch for ${assetName}`);
    }

    const archiveBinaryName = `cmdly-v${pkg.version}-${target}`;
    installBinary(archivePath, archiveBinaryName);

    console.log(`[postinstall] installed ${target} binary`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.warn(
    `[postinstall] native install failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(0);
});
