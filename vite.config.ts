import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const DEFAULT_BASE_PATH = "/omniagent.github.io/";
const DEFAULT_PORT = 3000;

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === "/") {
    return "/";
  }
  return `/${basePath.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ command }) => {
  const rawPort = process.env.PORT;
  const port = rawPort ? Number(rawPort) : DEFAULT_PORT;

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // In dev (`vite`), serve from "/". In build, honour BASE_PATH (set by the
  // GitHub Actions workflow) and fall back to the repo name so GitHub Pages
  // resolves /omniagent.github.io/assets/* correctly and the page is not blank.
  const base =
    command === "serve"
      ? "/"
      : normalizeBasePath(process.env.BASE_PATH ?? DEFAULT_BASE_PATH);

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    publicDir: path.resolve(import.meta.dirname, "public"),
    build: {
      // Output flat into ./dist so GitHub Pages can serve it directly,
      // not into ./dist/public as the previous broken build did.
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      assetsDir: "assets",
      sourcemap: false,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
