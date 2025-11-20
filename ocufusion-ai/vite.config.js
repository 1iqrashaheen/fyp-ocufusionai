import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const projectRoot = process.cwd();
  const rootEnv = loadEnv(mode, projectRoot, "");
  const parentEnv = loadEnv(mode, path.resolve(projectRoot, ".."), "");
  const env = { ...parentEnv, ...rootEnv };

  Object.assign(process.env, env);

  if (!env.VITE_GEMINI_API_KEY && env.GEMINI_API_KEY) {
    env.VITE_GEMINI_API_KEY = env.GEMINI_API_KEY;
  }
  if (!env.VITE_GEMINI_MODEL && env.GEMINI_MODEL) {
    env.VITE_GEMINI_MODEL = env.GEMINI_MODEL;
  }
  if (!env.VITE_GEMINI_BASE_URL && env.GEMINI_BASE_URL) {
    env.VITE_GEMINI_BASE_URL = env.GEMINI_BASE_URL;
  }

  const devProxyTarget = env.VITE_DEV_API_PROXY;
  const devProxyPath = env.VITE_DEV_API_PROXY_PATH || "/__local_api";

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const server = devProxyTarget
    ? {
        proxy: {
          [devProxyPath]: {
            target: devProxyTarget,
            changeOrigin: true,
            secure: false,
            rewrite: (path) =>
              path.replace(
                new RegExp(`^${escapeRegex(devProxyPath)}`),
                ""
              ),
          },
        },
      }
    : undefined;

  return {
    plugins: [react()],
    server,
    envPrefix: ["VITE_", "GEMINI_"],
  };
});
