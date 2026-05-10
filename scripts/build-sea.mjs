import { mkdirSync, rmSync, chmodSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import pkg from "../package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const supportedTargets = new Set(["linux-x64", "darwin-arm64"]);

const hostTarget = () => {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "linux" && arch === "x64") {
    return "linux-x64";
  }
  if (platform === "darwin" && arch === "arm64") {
    return "darwin-arm64";
  }
  return null;
};

const parseTarget = () => {
  const idx = process.argv.indexOf("--target");
  if (idx === -1) {
    return null;
  }
  const target = process.argv[idx + 1];
  if (!target) {
    throw new Error("Missing value for --target");
  }
  return target;
};

const targetArg = parseTarget();
const detectedHostTarget = hostTarget();

if (targetArg && !supportedTargets.has(targetArg)) {
  throw new Error(`Unsupported target: ${targetArg}`);
}

if (!detectedHostTarget) {
  throw new Error(
    `Unsupported host platform ${process.platform}-${process.arch}. Supported host targets: linux-x64, darwin-arm64.`,
  );
}

const target = targetArg ?? detectedHostTarget;

if (target !== detectedHostTarget) {
  throw new Error(
    `Target ${target} does not match host ${detectedHostTarget}. Build this target on a matching runner.`,
  );
}

if (Number.parseInt(process.versions.node.split(".")[0], 10) !== 26) {
  throw new Error(
    `Node 26.x required for SEA build, found ${process.version}. Use Node 26.x.`,
  );
}

const seaDir = join(rootDir, ".sea");
const bundlePath = join(seaDir, "index.cjs");
const seaConfigPath = join(seaDir, `sea-config.${target}.json`);
const outDir = join(rootDir, "dist", target);
const outFile = join(outDir, "cmdly");

rmSync(seaDir, { recursive: true, force: true });
mkdirSync(seaDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [join(rootDir, "src", "bin.ts")],
  outfile: bundlePath,
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node26",
  tsconfig: join(rootDir, "tsconfig.json"),
  logLevel: "info",
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    __NAME__: JSON.stringify(pkg.name),
  },
});

const seaConfig = {
  main: bundlePath,
  mainFormat: "commonjs",
  output: outFile,
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
  execArgvExtension: "env",
};

await writeFile(seaConfigPath, `${JSON.stringify(seaConfig, null, 2)}\n`, "utf8");

const result = spawnSync(process.execPath, ["--build-sea", seaConfigPath], {
  cwd: rootDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

chmodSync(outFile, 0o755);
console.log(`SEA binary built: ${outFile}`);
