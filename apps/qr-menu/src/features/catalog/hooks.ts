import { useSuspenseQuery } from "@tanstack/react-query";
import { cafeQuery, menuQuery } from "./queries";

export const useMenu = () => useSuspenseQuery(menuQuery());
export const useCafe = () => useSuspenseQuery(cafeQuery());
