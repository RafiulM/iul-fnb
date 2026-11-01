import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import type { PermissionKey } from "@starter/shared/fnb/fixtures";
import {
  createStaff,
  savePermissions,
  setStaffActive,
  setStaffPassword,
  updateStaff,
} from "./api";
import {
  staffCan,
  type CashierAccess,
  type StaffInput,
  type StaffMember,
} from "./model";
import { staffKeys, staffMembersQuery, staffPermissionsQuery } from "./queries";

export function useStaffMembers() {
  return useSuspenseQuery(staffMembersQuery());
}

export function useStaffPermissions() {
  return useSuspenseQuery(staffPermissionsQuery());
}

/** May the signed-in staff member do `key`? For hiding controls only. */
export function useStaffCan(key: PermissionKey) {
  const { role } = useRouteContext({ from: "/_protected" });
  const { data } = useStaffPermissions();
  return staffCan(data, role, key);
}

function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: staffKeys.all });
}

export function useCreateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: createStaff, onSuccess: invalidate });
}

export function useUpdateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({
      before,
      input,
    }: {
      before: StaffMember;
      input: StaffInput;
    }) => updateStaff(before, input),
    onSuccess: invalidate,
  });
}

export function useSetStaffActive() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setStaffActive(id, active),
    onSuccess: invalidate,
  });
}

export function useSetStaffPassword() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      setStaffPassword(id, password),
    onSuccess: invalidate,
  });
}

export function useSavePermissions() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (cashier: CashierAccess) => savePermissions(cashier),
    onSuccess: invalidate,
  });
}
