/// <reference types="vitest" />
import { resolve } from "path";
import { defineConfig, mergeConfig } from "vite";
import baseConfig from "./vite.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
        },
      },
    },
    plugins: [
      {
        name: "android-entry",
        transformIndexHtml(html) {
          return html.replace(
            'src="/src/main.tsx"',
            'src="/src/main.android.tsx"'
          );
        },
      },
    ],
  })
);
