import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
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
  };
});
