import type { RequestHandler } from "express";
import { staffRoleOf } from "@starter/shared/permissions";
import type { StaffPermissionKey } from "@starter/shared/fnb/access";
import { HttpError } from "../lib/http-error";
import { getStaffPermissions } from "../services/settings.service";
import { getAuth } from "./auth";

const forbidden = () =>
  new HttpError(403, "FORBIDDEN", "Your account cannot perform this action.");

/**
 * Cafe staff only. Mount after requireAuth, which re-reads the account on
 * every request, so a changed role or permission applies immediately.
 * With a key, a Kasir also needs that permission from the owner's matrix;
 * a Pemilik always passes.
 */
export function requireStaff(key?: StaffPermissionKey): RequestHandler {
  return async (req, _res, next) => {
    const role = staffRoleOf(getAuth(req).user.role);
    if (!role) throw forbidden();
    if (key && role !== "OWNER") {
      const { CASHIER } = await getStaffPermissions();
      if (!CASHIER[key]) throw forbidden();
    }
    next();
  };
}

/** Pemilik only (things no Kasir permission may grant). */
export const requireOwner: RequestHandler = (req, _res, next) => {
  if (staffRoleOf(getAuth(req).user.role) !== "OWNER") throw forbidden();
  next();
};
