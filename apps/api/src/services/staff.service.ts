import { and, asc, eq, sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { STAFF_ROLES, staffRoleOf } from "@starter/shared/permissions";
import type { StaffAccountDto } from "@starter/shared/fnb/api";
import type { StaffRole } from "@starter/shared/fnb/types";
import type {
  CreateStaffInput,
  UpdateStaffInput,
} from "@starter/shared/validators/fnb/staff";
import { db, type DbOrTx } from "../db";
import { session, user } from "../db/schema";
import { auth } from "../lib/auth";
import { HttpError } from "../lib/http-error";
import { notFound, uniqueOr409 } from "../lib/fnb";

// Staff accounts are Better Auth users whose role makes them cafe staff:
// "owner" (Pemilik), "cashier" (Kasir), or the platform "admin" (Pemilik too).

const STORED_ROLE: Record<StaffRole, "owner" | "cashier"> = {
  OWNER: "owner",
  CASHIER: "cashier",
};

const COLORS = [
  "#C2410C",
  "#0F766E",
  "#7C3AED",
  "#B45309",
  "#1D4ED8",
  "#BE185D",
];
const colorFor = (id: string) =>
  COLORS[
    [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) %
      COLORS.length
  ]!;

const roleList = sql`string_to_array(replace(coalesce(${user.role}, ''), ' ', ''), ',')`;
const isStaff = sql`${roleList} && ${sql.raw(
  `ARRAY[${STAFF_ROLES.map((r) => `'${r}'`).join(",")}]::text[]`,
)}`;
const isOwner = sql`${roleList} && ARRAY['owner','admin']::text[]`;
const isAdmin = (role: string | null) =>
  (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .includes("admin");

const fields = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  banned: user.banned,
  createdAt: user.createdAt,
  // Spelled out: Drizzle leaves columns unqualified inside select fields.
  lastLoginAt:
    sql<Date | null>`(SELECT max(s.created_at) FROM session s WHERE s.user_id = "user"."id")`.mapWith(
      (v: string | Date | null) => (v ? new Date(v) : null),
    ),
  // No password yet: added by the owner and not set up.
  invited: sql<boolean>`NOT EXISTS (SELECT 1 FROM account a WHERE a.user_id = "user"."id" AND a.provider_id = 'credential' AND a.password IS NOT NULL)`,
};

type Row = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  invited: boolean;
};

/** The earliest owner account: it cannot be deactivated or demoted. */
async function primaryOwnerId(conn: DbOrTx) {
  const [row] = await conn
    .select({ id: user.id })
    .from(user)
    .where(isOwner)
    .orderBy(asc(user.createdAt), asc(user.id))
    .limit(1);
  return row?.id ?? null;
}

const toDto = (r: Row, primaryId: string | null): StaffAccountDto => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: staffRoleOf(r.role) ?? "CASHIER",
  isActive: !r.banned,
  createdAt: r.createdAt.toISOString(),
  lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
  color: colorFor(r.id),
  invited: r.invited,
  isPrimaryOwner: r.id === primaryId,
});

export async function listStaff() {
  const [rows, primaryId] = await Promise.all([
    db
      .select(fields)
      .from(user)
      .where(isStaff)
      .orderBy(asc(user.createdAt), asc(user.id)),
    primaryOwnerId(db),
  ]);
  return rows.map((r) => toDto(r, primaryId));
}

async function getStaffRow(conn: DbOrTx, id: string) {
  const [row] = await conn
    .select(fields)
    .from(user)
    .where(and(eq(user.id, id), isStaff))
    .limit(1);
  if (!row) throw notFound("Akun staf");
  return row;
}

async function getStaff(conn: DbOrTx, id: string) {
  return toDto(await getStaffRow(conn, id), await primaryOwnerId(conn));
}

const ownerOnly = () =>
  new HttpError(
    403,
    "OWNER_ONLY",
    "Hanya pemilik yang bisa mengatur akun pemilik.",
  );

/**
 * Adds a staff account. With a password it can sign in at once; without one
 * it stays "invited" until the owner sets a password.
 */
export async function createStaff(
  actorRole: StaffRole,
  input: CreateStaffInput,
) {
  if (input.role === "OWNER" && actorRole !== "OWNER") throw ownerOnly();
  try {
    const result = await auth.api.createUser({
      body: {
        email: input.email,
        ...(input.password ? { password: input.password } : {}),
        name: input.name,
        role: STORED_ROLE[input.role],
      },
    });
    return getStaff(db, result.user.id);
  } catch (error) {
    if (error instanceof APIError && error.status === "BAD_REQUEST")
      throw new HttpError(409, "ALREADY_EXISTS", "Email sudah terdaftar.");
    throw error;
  }
}

/**
 * Rename, change email or role, or (de)activate. Nobody can demote or
 * deactivate themselves or the primary owner, an active owner always
 * remains, only owners touch owner accounts, and platform admins are managed
 * with `pnpm role:set` only.
 */
export async function updateStaff(
  actor: { id: string; role: StaffRole },
  id: string,
  input: UpdateStaffInput,
) {
  return db.transaction(async (tx) => {
    // Serialize staff changes so two owners cannot both step down at once.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('fnb:staff'))`);
    const target = await getStaffRow(tx, id);
    const currentRole = staffRoleOf(target.role);
    const changesRole = input.role !== undefined && input.role !== currentRole;
    const deactivates = input.isActive === false && !target.banned;

    if (
      actor.role !== "OWNER" &&
      (currentRole === "OWNER" || input.role === "OWNER")
    )
      throw ownerOnly();
    if ((changesRole || input.isActive !== undefined) && isAdmin(target.role))
      throw new HttpError(
        409,
        "ADMIN_ACCOUNT",
        "Akun admin diatur lewat pnpm role:set, bukan dari layar staf.",
      );
    if ((changesRole || deactivates) && id === actor.id)
      throw new HttpError(
        409,
        "CANNOT_CHANGE_SELF",
        "Anda tidak bisa mengubah peran atau menonaktifkan akun sendiri.",
      );
    if ((changesRole || deactivates) && id === (await primaryOwnerId(tx)))
      throw new HttpError(
        409,
        "PRIMARY_OWNER",
        "Pemilik utama tidak bisa dinonaktifkan atau diubah perannya.",
      );
    if (
      currentRole === "OWNER" &&
      !target.banned &&
      (deactivates || changesRole)
    ) {
      const owners = await tx
        .select({ banned: user.banned })
        .from(user)
        .where(isOwner);
      if (owners.filter((o) => !o.banned).length <= 1)
        throw new HttpError(
          409,
          "LAST_OWNER",
          "Harus ada minimal satu pemilik aktif.",
        );
    }

    await uniqueOr409(
      () =>
        tx
          .update(user)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.email !== undefined && input.email !== target.email
              ? { email: input.email, emailVerified: false }
              : {}),
            ...(changesRole ? { role: STORED_ROLE[input.role!] } : {}),
            ...(input.isActive === false
              ? { banned: true, banReason: "Dinonaktifkan oleh pemilik" }
              : input.isActive === true
                ? { banned: false, banReason: null, banExpires: null }
                : {}),
          })
          .where(eq(user.id, id)),
      "Email sudah terdaftar.",
    );
    // A deactivated account is signed out everywhere at once.
    if (deactivates) await tx.delete(session).where(eq(session.userId, id));
    return getStaff(tx, id);
  });
}

/**
 * Sets a password (also completing an invited account) and ends the staff
 * member's sessions. Emailed reset links need an email provider.
 */
export async function setStaffPassword(
  actorRole: StaffRole,
  id: string,
  password: string,
) {
  const target = await getStaffRow(db, id);
  if (staffRoleOf(target.role) === "OWNER" && actorRole !== "OWNER")
    throw ownerOnly();
  if (target.banned)
    throw new HttpError(
      409,
      "ACCOUNT_INACTIVE",
      "Aktifkan akun ini terlebih dahulu.",
    );
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const credential = (await ctx.internalAdapter.findAccounts(id)).find(
    (a) => a.providerId === "credential",
  );
  if (credential) await ctx.internalAdapter.updatePassword(id, hash);
  else
    await ctx.internalAdapter.linkAccount({
      userId: id,
      providerId: "credential",
      accountId: id,
      password: hash,
    });
  await ctx.internalAdapter.deleteUserSessions(id);
}
