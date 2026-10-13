import { queryOptions } from "@tanstack/react-query";
import { getPermissions, listStaff } from "./api";

// Every key starts with "staff", so invalidating staffKeys.all refreshes all.
export const staffKeys = {
  all: ["staff"] as const,
  members: ["staff", "members"] as const,
  permissions: ["staff", "permissions"] as const,
};

export function staffMembersQuery() {
  return queryOptions({ queryKey: staffKeys.members, queryFn: listStaff });
}

export function staffPermissionsQuery() {
  return queryOptions({
    queryKey: staffKeys.permissions,
    queryFn: getPermissions,
  });
}
