import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createTable,
  markTablesPrinted,
  regenerateTableQr,
  setTableActive,
} from "./api";
import { tableKeys, tablesQuery, unprintedTablesQuery } from "./queries";

export function useTables() {
  return useSuspenseQuery(tablesQuery());
}

export function useTablesMaybe() {
  return useQuery(tablesQuery());
}

/** Ids of tables whose current QR has not been printed yet. */
export function useUnprintedTableIds() {
  return useSuspenseQuery(unprintedTablesQuery());
}

/* ---------- Mutations (owner: Menu & Meja) ---------- */

// tableKeys.all is a prefix of tableKeys.unprinted(), so one invalidation
// refreshes both lists.

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTable,
    onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.all }),
  });
}

/** Optimistic, so the switch moves immediately like the prototype. */
export function useSetTableActive() {
  const qc = useQueryClient();
  const key = tablesQuery().queryKey;
  return useMutation({
    mutationFn: setTableActive,
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: key, exact: true });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (list) =>
        list?.map((t) => (t.id === id ? { ...t, isActive } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: tableKeys.all, exact: true }),
  });
}

export function useRegenerateTableQr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: regenerateTableQr,
    onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.all }),
  });
}

export function useMarkTablesPrinted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markTablesPrinted,
    onSuccess: (ids) => qc.setQueryData(unprintedTablesQuery().queryKey, ids),
  });
}
