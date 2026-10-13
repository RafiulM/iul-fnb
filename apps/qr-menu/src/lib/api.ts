import type { ApiErrorBody } from "@starter/shared/types";

// The customer app calls only the API's public endpoints: no account and no
// cookies. VITE_API_URL is inlined at build time.
const CONFIGURED_API_URL = new URL(
  import.meta.env.VITE_API_URL ?? "http://localhost:4000",
);

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

// A phone that opened the menu through this machine's LAN address cannot
// reach "localhost": call the API on the same host the page came from.
function apiOrigin() {
  if (
    typeof window !== "undefined" &&
    LOOPBACK.has(CONFIGURED_API_URL.hostname) &&
    !LOOPBACK.has(window.location.hostname)
  ) {
    const url = new URL(CONFIGURED_API_URL);
    url.hostname = window.location.hostname;
    return url.origin;
  }
  return CONFIGURED_API_URL.origin;
}

/** A failed API call, carrying the API's error envelope. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function publicFetch<T>(
  path: string,
  { method = "GET", body }: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(new URL(path, apiOrigin()), {
      method,
      credentials: "omit",
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Tidak tersambung ke server. Periksa koneksi lalu coba lagi.",
    );
  }
  const payload = (await response.json().catch(() => null)) as
    ({ data: T } & Partial<ApiErrorBody>) | null;
  if (!response.ok || !payload) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      error?.message ?? "Terjadi kesalahan. Coba lagi.",
    );
  }
  return payload.data;
}
