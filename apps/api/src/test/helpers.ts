import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app";
import { auth } from "../lib/auth";

if (!process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"))
  throw new Error(
    "Run pnpm test from the repository root so these tests get their own disposable PostgreSQL server.",
  );

export const WEB_ORIGIN = new URL(
  process.env.WEB_URL ?? "http://localhost:3101",
).origin;
export const originHeader = { Origin: WEB_ORIGIN };

// A supertest agent keeps cookies between requests, like a browser.
export function agent(app: Express = createApp()) {
  return request.agent(app);
}

const PASSWORD = "Test-password-123!";

// Public sign-up only creates the very first account (the cafe owner), so
// test accounts are created the way an owner adds staff (Better Auth's admin
// createUser, default role) and then sign in for real to get a session cookie.
export async function signUp(
  client: ReturnType<typeof agent>,
  name = "Test User",
) {
  const email = `test-${randomUUID()}@example.com`;
  await auth.api.createUser({ body: { name, email, password: PASSWORD } });
  const response = await client
    .post("/api/auth/sign-in/email")
    .set(originHeader)
    .send({ email, password: PASSWORD });
  if (response.status !== 200)
    throw new Error(`Sign-in failed with ${response.status}`);
  return email;
}

/** The real public sign-up endpoint (only open while there are no accounts). */
export function publicSignUp(
  client: ReturnType<typeof agent>,
  name = "Test User",
) {
  const email = `test-${randomUUID()}@example.com`;
  return client
    .post("/api/auth/sign-up/email")
    .set(originHeader)
    .send({ name, email, password: PASSWORD });
}

// Roles are granted out of band, the way pnpm role:set does it.
export async function setRole(email: string, role: string | null) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const { rowCount } = await pool.query(
      'UPDATE "user" SET role = $1 WHERE email = $2',
      [role, email],
    );
    if (rowCount !== 1) throw new Error(`No user ${email}`);
  } finally {
    await pool.end();
  }
}
