import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { Providers } from "@/components/providers";
import { getSessionFn, type Session } from "@/lib/session";
import globalsCss from "@/styles/globals.css?url";

export type RouterContext = {
  queryClient: QueryClient;
  session: Session | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  // One session read per navigation (the API, via the auth middleware), shared
  // with every route as context. Layouts decide what to do with it; the API
  // still authenticates every request on its own.
  beforeLoad: async () => ({ session: await getSessionFn() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${siteConfig.name} — Kasir & Dashboard` },
      { name: "theme-color", content: "#FBF5F0" },
      { name: "description", content: siteConfig.description },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>
          <a
            href="#main-content"
            className="sr-only z-50 rounded-md bg-foreground p-3 text-background focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
          >
            Lewati ke konten
          </a>
          {children}
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main
      id="main-content"
      className="l-staf-empty"
      style={{ minHeight: "70vh", alignContent: "center" }}
    >
      <strong>Halaman tidak ditemukan</strong>
      <span>
        Alamat ini tidak ada. Kembali ke layar utama untuk melanjutkan.
      </span>
      <Link className="l-staf-btn" data-variant="primary" to="/">
        Ke layar utama
      </Link>
    </main>
  );
}

function ErrorPage() {
  const router = useRouter();
  return (
    <main
      id="main-content"
      className="l-staf-empty"
      style={{ minHeight: "70vh", alignContent: "center" }}
    >
      <strong>Terjadi kesalahan</strong>
      <span>
        Coba muat ulang halaman ini. Kalau terus terjadi, periksa terminal yang
        menjalankan <code>pnpm dev</code>.
      </span>
      <button
        className="l-staf-btn"
        data-variant="primary"
        onClick={() => router.invalidate()}
      >
        Coba lagi
      </button>
    </main>
  );
}
