import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { saveManualDraft } from "./api";
import { manualDraftKeys, manualDraftQuery } from "./queries";

export function useManualDraft() {
  return useSuspenseQuery(manualDraftQuery());
}

/** Autosave of the ticket; the cache follows what was stored. */
export function useSaveManualDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveManualDraft,
    onSuccess: (draft) => queryClient.setQueryData(manualDraftKeys.all, draft),
  });
}
