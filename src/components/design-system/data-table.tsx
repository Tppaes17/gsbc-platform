"use client";
"use no memo";

import { type ReactNode, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { TableToolbar } from "./table-toolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  /** Liga busca client-side por texto livre (regra 29 do master prompt:
   * sobre o conjunto já disponível — nenhuma API nova nesta rodada;
   * busca server-side fica registrada como necessidade futura). */
  enableSearch?: boolean;
  searchPlaceholder?: string;
  density?: "compact" | "default";
  renderMobileCard?: (row: TData) => ReactNode;
  tableLabel?: string;
}

/**
 * Tabela base do sistema (regra 44): paginação client-side pronta de fábrica,
 * estados de loading e vazio, e — desde o Stage 4 da revisão de design —
 * busca por texto livre e ordenação de coluna opcionais. Para volumes
 * grandes, paginar no servidor e passar `data` já recortada por página
 * (regra 57).
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription,
  pageSize = 20,
  enableSearch = false,
  searchPlaceholder,
  density = "default",
  renderMobileCard,
  tableLabel = "Tabela de dados",
}: DataTableProps<TData, TValue>) {
  "use no memo";

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: { pagination: { pageSize } },
    state: { globalFilter, sorting },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const filteredRows = table.getFilteredRowModel().rows;
  const hasActiveFilter = enableSearch && globalFilter.trim() !== "";
  const noResultsFromFilter = hasActiveFilter && filteredRows.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {enableSearch ? (
        <TableToolbar
          searchValue={globalFilter}
          onSearchChange={setGlobalFilter}
          searchPlaceholder={searchPlaceholder ?? "Buscar..."}
          count={filteredRows.length}
          onReset={hasActiveFilter ? () => setGlobalFilter("") : undefined}
        />
      ) : null}

      {noResultsFromFilter ? (
        <EmptyState
          title="Nenhum resultado corresponde à busca"
          description="Tente outro termo ou limpe a busca pra ver todos os registros."
          action={
            <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        <>
          <div className={renderMobileCard ? "hidden xl:block" : "block"}>
            <div className="overflow-hidden rounded-md border bg-card">
              <div className="overflow-x-auto">
                <Table aria-label={tableLabel} className="min-w-full">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          const canSort = header.column.getCanSort();
                          const sortDirection = header.column.getIsSorted();
                          const meta = header.column.columnDef.meta;
                          return (
                            <TableHead
                              key={header.id}
                              aria-sort={
                                sortDirection === "asc"
                                  ? "ascending"
                                  : sortDirection === "desc"
                                    ? "descending"
                                    : undefined
                              }
                              className={cn(
                                "sticky top-0 z-10 bg-card text-xs",
                                meta?.isNumeric ? "text-right" : null,
                                meta?.isPrimary ? "min-w-56" : null,
                                meta?.headerClassName,
                              )}
                            >
                              {header.isPlaceholder ? null : canSort ? (
                                <button
                                  type="button"
                                  onClick={header.column.getToggleSortingHandler()}
                                  className={cn(
                                    "inline-flex items-center gap-1 text-left hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                                    meta?.isNumeric ? "justify-end" : null,
                                  )}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {sortDirection === "asc" ? (
                                    <ArrowUp className="h-3 w-3" />
                                  ) : sortDirection === "desc" ? (
                                    <ArrowDown className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                  )}
                                </button>
                              ) : (
                                flexRender(header.column.columnDef.header, header.getContext())
                              )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              density === "compact" ? "px-2 py-1.5" : null,
                              cell.column.columnDef.meta?.isNumeric ? "text-right" : null,
                              cell.column.columnDef.meta?.isPrimary ? "min-w-56" : null,
                              cell.column.columnDef.meta?.cellClassName,
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {renderMobileCard ? (
            <div className="grid gap-3 xl:hidden" aria-label={`${tableLabel} em cards`}>
              {table.getRowModel().rows.map((row) => (
                <div key={row.id}>{renderMobileCard(row.original)}</div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próxima
          </Button>
        </div>
      ) : null}
    </div>
  );
}
