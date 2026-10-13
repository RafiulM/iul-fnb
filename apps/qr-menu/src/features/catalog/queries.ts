import { queryOptions } from "@tanstack/react-query";
import { getCafe, getMenu } from "./api";

export const catalogKeys = {
  menu: ["menu"] as const,
  cafe: ["cafe"] as const,
};

export const menuQuery = () =>
  queryOptions({ queryKey: catalogKeys.menu, queryFn: getMenu });
export const cafeQuery = () =>
  queryOptions({ queryKey: catalogKeys.cafe, queryFn: getCafe });
