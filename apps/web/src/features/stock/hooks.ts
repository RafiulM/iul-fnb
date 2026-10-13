import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { stockStatus } from "@starter/shared/fnb/domain";
import type { IngredientDto } from "@starter/shared/fnb/types";
import { menuKeys } from "@/features/menu/queries";
import {
  createIngredient,
  recordStockIn,
  updateIngredient,
  type IngredientUpdate,
  type StockContext,
  type StockInInput,
} from "./api";
import {
  ingredientsQuery,
  recipeItemsQuery,
  stockKeys,
  stockMovementsQuery,
} from "./queries";

export function useIngredients() {
  return useSuspenseQuery(ingredientsQuery());
}

export function useRecipeItems() {
  return useSuspenseQuery(recipeItemsQuery());
}

export function useStockMovements() {
  return useSuspenseQuery(stockMovementsQuery());
}

/** Number of ingredients running low or out, for the sidebar badge. */
export function useLowStockCount() {
  const { data } = useQuery(ingredientsQuery());
  return data?.filter((i) => stockStatus(i) !== "AMAN").length ?? 0;
}

// Stock changes can switch menus habis/tersedia on the API, so menus refresh too.
function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: stockKeys.all }),
      queryClient.invalidateQueries({ queryKey: menuKeys.all }),
    ]);
}

export function useRecordStockIn() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({ input, ctx }: { input: StockInInput; ctx: StockContext }) =>
      recordStockIn(input, ctx),
    onSuccess: invalidate,
  });
}

export function useCreateIngredient() {
  const invalidate = useInvalidateStock();
  return useMutation({ mutationFn: createIngredient, onSuccess: invalidate });
}

export function useUpdateIngredient() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({
      before,
      input,
    }: {
      before: IngredientDto;
      input: IngredientUpdate;
    }) => updateIngredient(before, input),
    onSuccess: invalidate,
  });
}
