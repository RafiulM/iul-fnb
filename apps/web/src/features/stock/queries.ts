import { queryOptions } from "@tanstack/react-query";
import { listIngredients, listRecipeItems, listStockMovements } from "./api";

export const stockKeys = {
  all: ["stock"] as const,
  ingredients: () => [...stockKeys.all, "ingredients"] as const,
  recipes: () => [...stockKeys.all, "recipes"] as const,
  movements: () => [...stockKeys.all, "movements"] as const,
};

export function ingredientsQuery() {
  return queryOptions({
    queryKey: stockKeys.ingredients(),
    queryFn: listIngredients,
  });
}

export function recipeItemsQuery() {
  return queryOptions({
    queryKey: stockKeys.recipes(),
    queryFn: listRecipeItems,
  });
}

export function stockMovementsQuery() {
  return queryOptions({
    queryKey: stockKeys.movements(),
    queryFn: listStockMovements,
  });
}
