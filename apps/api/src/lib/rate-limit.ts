import type { RequestHandler } from "express";
import { HttpError } from "./http-error";

// A small in-memory fixed-window limiter keyed by client IP (req.ip honors
// TRUST_PROXY). Enough for one API process; use a shared store such as Redis
// before running several instances.

const limiters = new Set<Map<string, { count: number; resetAt: number }>>();

export function rateLimit({
  windowMs,
  max,
  message = "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
}: {
  windowMs: number;
  max: number;
  message?: string;
}): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  limiters.add(hits);
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      // Drop expired entries now and then so the map stays small.
      if (hits.size > 10_000)
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      throw new HttpError(429, "RATE_LIMITED", message);
    }
    next();
  };
}

/** Clears every limiter's counters (tests). */
export function resetRateLimits() {
  for (const hits of limiters) hits.clear();
}
