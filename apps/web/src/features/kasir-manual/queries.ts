import { queryOptions } from "@tanstack/react-query";
import { getManualDraft } from "./api";

export const manualDraftKeys = { all: ["kasir-manual", "draft"] as const };

export function manualDraftQuery() {
  return queryOptions({
    queryKey: manualDraftKeys.all,
    queryFn: getManualDraft,
  });
}
