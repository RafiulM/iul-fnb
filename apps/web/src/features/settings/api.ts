import type { CafeSettingsDto } from "@starter/shared/fnb/types";
import type { DataResponse } from "@starter/shared/types";
import { apiFetch } from "@/lib/api/client";

// GET/PATCH /api/settings.

export async function getSettings() {
  return (await apiFetch<DataResponse<CafeSettingsDto>>("/api/settings")).data;
}

export async function updateSettings(input: CafeSettingsDto) {
  const res = await apiFetch<DataResponse<CafeSettingsDto>>("/api/settings", {
    method: "PATCH",
    body: input,
  });
  return res.data;
}
