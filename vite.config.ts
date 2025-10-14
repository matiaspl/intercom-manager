import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  test: {
    environment: "jsdom",
    setupFiles: "src/test/setup.ts",
    globals: true,
    css: true,
    coverage: {
      reporter: ["text", "html", "lcov"],
      exclude: ["node_modules/", "dist/", "src/main.tsx"],
    },
  },
});
