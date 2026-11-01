import { Router } from "express";
import type { RegistrationDto } from "@starter/shared/types";
import { hasAnyAccount } from "../lib/auth";

// Whether the public sign-up page may be used: only to create the cafe's
// first account (its owner). Readable without an account, so the web app can
// send visitors from /sign-up to /sign-in once the cafe is set up. Better Auth
// enforces the same rule on /api/auth/sign-up/email.
export const registrationRouter = Router();

registrationRouter.get("/", async (_req, res) => {
  const data: RegistrationDto = { open: !(await hasAnyAccount()) };
  res.json({ data });
});
