import { createMiddleware, createStart } from "@tanstack/react-start";

// Browser hardening for every response (same policy as the Kasir app). HSTS
// only in production, so localhost is never pinned.
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  ...(process.env.NODE_ENV === "production"
    ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }
    : {}),
};

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    if (!result.response.headers.has(name))
      result.response.headers.set(name, value);
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}));
