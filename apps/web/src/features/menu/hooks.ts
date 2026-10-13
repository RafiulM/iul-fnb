import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { stockKeys } from "@/features/stock/queries";
import {
  createCategory,
  deleteCategory,
  deleteMenu,
  markMenusUnavailable,
  moveCategory,
  renameCategory,
  saveMenu,
  saveMenuRecipe,
  setMenuAvailability,
} from "./api";
import { categoriesQuery, menuKeys, menusQuery } from "./queries";

export function useCategories() {
  return useSuspenseQuery(categoriesQuery());
}

export function useMenus() {
  return useSuspenseQuery(menusQuery());
}

/* ---------- Mutations (owner: Menu & Meja) ---------- */

// Each mutation resolves after the refetch, so callers can focus/mark the
// updated element right after `await mutateAsync(…)`.

export function useSaveMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMenu,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: menuKeys.all }),
        qc.invalidateQueries({ queryKey: stockKeys.recipes() }),
      ]),
  });
}

export function useSaveMenuRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMenuRecipe,
    onSuccess: () => qc.invalidateQueries({ queryKey: stockKeys.recipes() }),
  });
}

/** Optimistic, so the switch moves immediately like the prototype. */
export function useSetMenuAvailability() {
  const qc = useQueryClient();
  const key = menusQuery().queryKey;
  return useMutation({
    mutationFn: setMenuAvailability,
    onMutate: async ({ id, isAvailable }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (list) =>
        list?.map((m) => (m.id === id ? { ...m, isAvailable } : m)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useMarkMenusUnavailable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markMenusUnavailable,
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useDeleteMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMenu,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: menuKeys.all }),
        qc.invalidateQueries({ queryKey: stockKeys.recipes() }),
      ]),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useRenameCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: renameCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useMoveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: moveCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}
