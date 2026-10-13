import { queryOptions } from "@tanstack/react-query";
import { getSettings } from "./api";

export const settingsKeys = { all: ["settings"] as const };

export function settingsQuery() {
  return queryOptions({ queryKey: settingsKeys.all, queryFn: getSettings });
}
