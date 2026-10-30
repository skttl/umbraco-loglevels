import { defineConfig } from "vite";
export default defineConfig({
  build: {
    lib: { entry: "src/entrypoint.ts", formats: ["es"], fileName: "loglevels" },
    outDir: "../wwwroot",
    emptyOutDir: true,
    rollupOptions: { external: [/^@umbraco-cms\//] },
  },
});
