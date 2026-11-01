import { queryOptions } from "@tanstack/react-query";
import { getRegistration } from "./api";

export const registrationKeys = { all: ["registration"] as const };

export function registrationQuery() {
  return queryOptions({
    queryKey: registrationKeys.all,
    queryFn: getRegistration,
    // It flips once, when the owner signs up: always ask again.
    staleTime: 0,
  });
}
