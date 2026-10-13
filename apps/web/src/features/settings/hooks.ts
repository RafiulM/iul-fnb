import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { updateSettings } from "./api";
import { settingsKeys, settingsQuery } from "./queries";

export function useSettings() {
  return useSuspenseQuery(settingsQuery());
}

/** Non-suspending variant for chrome (sidebar) that may render before data. */
export function useSettingsMaybe() {
  return useQuery(settingsQuery());
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) =>
      queryClient.setQueryData(settingsKeys.all, settings),
  });
}
