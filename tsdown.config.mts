import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "src/index.ts",
    outDir: "dist",
    format: "esm",
    platform: "neutral",
    dts: true,
    sourcemap: true,
  },
  {
    entry: "plugin/src/withCriiptoVerify.ts",
    outDir: "plugin/build",
    format: "cjs",
    platform: "node",
    dts: false,
    sourcemap: true,
  },
]);
