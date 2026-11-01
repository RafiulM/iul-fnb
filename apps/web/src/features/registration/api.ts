import type { DataResponse, RegistrationDto } from "@starter/shared/types";
import { apiFetch } from "@/lib/api/client";

/** GET /api/registration: public sign-up only creates the cafe's first account. */
export async function getRegistration() {
  return (await apiFetch<DataResponse<RegistrationDto>>("/api/registration"))
    .data;
}
