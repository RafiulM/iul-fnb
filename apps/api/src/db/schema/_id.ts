import { randomUUID } from "node:crypto";
import { text } from "drizzle-orm/pg-core";

// Text primary keys: seeded sample rows keep readable ids ("m1", "makanan")
// that the frontends already know; new rows get a random UUID.
export const textId = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());
