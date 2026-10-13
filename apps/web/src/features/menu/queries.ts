import { queryOptions } from "@tanstack/react-query";
import { listCategories, listMenus } from "./api";

export const menuKeys = {
  all: ["menu"] as const,
  categories: () => [...menuKeys.all, "categories"] as const,
  menus: () => [...menuKeys.all, "menus"] as const,
};

export function categoriesQuery() {
  return queryOptions({
    queryKey: menuKeys.categories(),
    queryFn: listCategories,
  });
}

export function menusQuery() {
  return queryOptions({ queryKey: menuKeys.menus(), queryFn: listMenus });
}
