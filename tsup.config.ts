import { defineConfig } from "tsup";
import packageJSON from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(packageJSON.version),
    __NAME__: JSON.stringify(packageJSON.name),
  },
  entry: ["src/bin.ts"],
  clean: true,
  publicDir: true,
  treeshake: "smallest",
  external: ["@parcel/watcher"],
});
