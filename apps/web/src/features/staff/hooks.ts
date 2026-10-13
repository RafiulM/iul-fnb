import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createStaff,
  savePermissions,
  setStaffActive,
  setStaffPassword,
  updateStaff,
} from "./api";
import type { CashierAccess, StaffInput, StaffMember } from "./model";
import { staffKeys, staffMembersQuery, staffPermissionsQuery } from "./queries";

export function useStaffMembers() {
  return useSuspenseQuery(staffMembersQuery());
}

export function useStaffPermissions() {
  return useSuspenseQuery(staffPermissionsQuery());
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
