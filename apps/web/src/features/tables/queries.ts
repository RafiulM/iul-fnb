import { queryOptions } from "@tanstack/react-query";
import { listTables, listUnprintedTableIds } from "./api";

export const tableKeys = {
  all: ["tables"] as const,
  unprinted: () => [...tableKeys.all, "unprinted"] as const,
};

export function tablesQuery() {
  return queryOptions({ queryKey: tableKeys.all, queryFn: listTables });
}

export function unprintedTablesQuery() {
  return queryOptions({
    queryKey: tableKeys.unprinted(),
    queryFn: listUnprintedTableIds,
  });
}
