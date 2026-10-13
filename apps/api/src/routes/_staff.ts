import type { Request } from "express";
import { getAuth } from "../middleware/auth";
import type { Actor } from "../services/stock.service";

/** The signed-in staff member, recorded on orders and stock movements. */
export function actorOf(req: Request): Actor {
  const { user } = getAuth(req);
  return { id: user.id, name: user.name };
}
