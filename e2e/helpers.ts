import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, request, type APIRequestContext } from "@playwright/test";
import { API_URL, WEB_URL } from "../playwright.config";

export { API_URL, WEB_URL };

// Cookie-authenticated mutations must come from the web app's origin.
export const headers = { Origin: WEB_URL };
export const PASSWORD = "A-long-test-password-123!";

// The cafe's first account, created by auth.spec.ts through the sign-up page
// (or here, when a spec runs on its own). Public sign-up closes after it.
export const OWNER_EMAIL = "pemilik-e2e@example.com";

/** POST to Better Auth, honoring its retry window once when rate limited. */
async function authPost(
  client: APIRequestContext,
  path: string,
  data: Record<string, string>,
) {
  let response = await client.post(`${API_URL}${path}`, { headers, data });
  if (response.status() === 429) {
    // The production auth server limits rapid sign-ins and sign-ups.
    const seconds = Number(response.headers()["retry-after"] || 10);
    await delay((Math.min(seconds, 10) + 0.1) * 1000);
    response = await client.post(`${API_URL}${path}`, { headers, data });
  }
  return response;
}

let ownerClient: Promise<APIRequestContext> | undefined;

/** A signed-in client for the owner account, creating it if the cafe has none. */
export function owner() {
  ownerClient ??= (async () => {
    const client = await request.newContext();
    const credentials = { email: OWNER_EMAIL, password: PASSWORD };
    if ((await authPost(client, "/api/auth/sign-in/email", credentials)).ok())
      return client;
    const created = await authPost(client, "/api/auth/sign-up/email", {
      name: "Pemilik E2E",
      ...credentials,
    });
    expect(created.status()).toBe(200);
    return client;
  })();
  return ownerClient;
}

// Public sign-up only creates the cafe's first account, so test accounts are
// added the way an owner adds staff (POST /api/staff), given `role` (the
// default role, like a self-registered account), then signed in. The session
// cookie it sets for localhost also reaches the web app (cookies ignore ports).
export async function signUp(
  client: APIRequestContext,
  name = "Test User",
  role = "user",
) {
  const email = `e2e-${randomUUID()}@example.com`;
  const added = await (
    await owner()
  ).post(`${API_URL}/api/staff`, {
    headers,
    data: { name, email, role: "CASHIER", password: PASSWORD },
  });
  expect(added.status()).toBe(201);
  await setRole(email, role);
  const signIn = await authPost(client, "/api/auth/sign-in/email", {
    email,
    password: PASSWORD,
  });
  expect(signIn.status()).toBe(200);
  return email;
}

// Roles are granted out of band, the way pnpm role:set does it.
export async function setRole(email: string, role: string | null) {
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 1,
  });
  try {
    const { rowCount } = await pool.query(
      'UPDATE "user" SET role = $1 WHERE email = $2',
      [role, email],
    );
    expect(rowCount).toBe(1);
  } finally {
    await pool.end();
  }
}

export async function fitsWidth(page: import("@playwright/test").Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
}
