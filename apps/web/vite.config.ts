import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Both apps share the repository root's .env.local / .env.
const envDir = resolve(import.meta.dirname, "../..");

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

// This machine's private IPv4 address on the local network, if any.
function lanAddress() {
  for (const entries of Object.values(networkInterfaces()))
    for (const entry of entries ?? [])
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
  return undefined;
}

export default defineConfig(({ command, mode }) => {
  // Server modules read process.env. In development Vite only exposes VITE_*
  // to the browser, so loading the whole file here never leaks a secret.
  if (command === "serve") {
    for (const [key, value] of Object.entries(loadEnv(mode, envDir, "")))
      if (process.env[key] === undefined) process.env[key] = value;
    // A phone cannot open "localhost": in development, table QR codes point
    // at this machine's LAN address so any device on the same Wi-Fi can scan
    // them. Vite prefers process.env over the env files, so this wins.
    const qrMenu = new URL(
      process.env.VITE_QR_MENU_URL || "http://localhost:3001",
    );
    const lan = lanAddress();
    if (lan && LOOPBACK.has(qrMenu.hostname)) {
      qrMenu.hostname = lan;
      process.env.VITE_QR_MENU_URL = qrMenu.origin;
    }
  }
  // The dev server listens on WEB_URL's port, so the origin the API trusts
  // and the address you open always match.
  const port =
    Number(new URL(process.env.WEB_URL || "http://localhost:3000").port) ||
    3000;
  return {
    envDir,
    resolve: { tsconfigPaths: true },
    server: { port, strictPort: true },
    // node-server emits .output/server/index.mjs, a portable Node server that
    // honors PORT and HOST. The Dockerfile ships only that folder.
    nitro: {
      preset: "node-server",
      rolldownConfig: {
        // Libraries ship RSC "use client" directives; this app has no server
        // components, so the bundler's notice about dropping them is noise.
        onwarn(warning: { code?: string }, warn: (warning: never) => void) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
          warn(warning as never);
        },
      },
    },
    plugins: [
      tailwindcss(),
      tanstackStart(),
      // Nitro is the deployment adapter; development uses Start's own server.
      command === "build" && nitro(),
      // React's plugin must come after Start's.
      viteReact(),
    ],
  };
});
