import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

// The customer QR Menu app. Shares the repository root's .env.local / .env
// with the other apps but needs no secrets: it is fully public.
const envDir = resolve(import.meta.dirname, "../..");

export default defineConfig(({ command, mode }) => {
  if (command === "serve") {
    for (const [key, value] of Object.entries(loadEnv(mode, envDir, "")))
      if (process.env[key] === undefined) process.env[key] = value;
  }
  // The dev server listens on VITE_QR_MENU_URL's port, the same address the
  // Kasir app prints into table QR codes. It binds every interface so phones
  // on the same network can open the LAN address those codes carry.
  const port =
    Number(
      new URL(process.env.VITE_QR_MENU_URL || "http://localhost:3001").port,
    ) || 3001;
  return {
    envDir,
    resolve: { tsconfigPaths: true },
    server: { host: true, port, strictPort: true },
    nitro: {
      preset: "node-server",
      rolldownConfig: {
        onwarn(warning: { code?: string }, warn: (warning: never) => void) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
          warn(warning as never);
        },
      },
    },
    plugins: [tanstackStart(), command === "build" && nitro(), viteReact()],
  };
});
