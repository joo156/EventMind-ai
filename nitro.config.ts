import { defineNitroConfig } from "nitropack";

export default defineNitroConfig({
  srcDir: "src",
  rootDir: ".",
  buildDir: ".output",
  presets: ["vercel"],
  typescript: {
    strict: true,
  },
  imports: {
    auto: true,
    dirs: ["./src/lib", "./src/utils"],
  },
  rollupConfig: {
    output: {
      entryFileNames: "_nitro/[name].mjs",
      chunkFileNames: "_nitro/[name]-[hash].mjs",
    },
  },
});
