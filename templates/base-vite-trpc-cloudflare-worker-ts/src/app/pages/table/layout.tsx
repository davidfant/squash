"use client";

import { PageHeader } from "@/app/components/blocks/page-header";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, CopyIcon } from "lucide-react";
import * as React from "react";

const sampleData: Payment[] = [
  {
    id: "m5gr84i9",
    amount: 316,
    status: "success",
    name: "ken99@example.com",
  },
  {
    id: "3u1reuv4",
    amount: 242,
    status: "success",
    name: "Abe45@example.com",
  },
  {
    id: "derv1ws0",
    amount: 837,
    status: "processing",
    name: "Monserrat44@example.com",
  },
  {
    id: "5kma53ae",
    amount: 874,
    status: "success",
    name: "Silas22@example.com",
  },
  {
    id: "bhqecj4p",
    amount: 721,
    status: "failed",
    name: "carmella@example.com",
  },
];

export type Payment = {
  id: string;
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  name: string;
};

export const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: () => <Skeleton className="w-24 h-5" />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown />
      </Button>
    ),
    cell: () => <Skeleton className="w-48 h-5" />,
  },
  {
    accessorKey: "amount",
    header: () => "Amount",
    cell: () => <Skeleton className="w-32 h-5" />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original;

      // return (
      //   <DropdownMenu>
      //     <DropdownMenuTrigger asChild>
      //       <Button variant="ghost" className="h-8 w-8 p-0">
      //         <span className="sr-only">Open menu</span>
      //         <MoreHorizontal />
      //       </Button>
      //     </DropdownMenuTrigger>
      //     <DropdownMenuContent align="end">
      //       <DropdownMenuLabel>Actions</DropdownMenuLabel>
      //       <DropdownMenuItem
      //         onClick={() => navigator.clipboard.writeText(payment.id)}
      //       >
      //         Copy payment ID
      //       </DropdownMenuItem>
      //       <DropdownMenuSeparator />
      //       <DropdownMenuItem>View customer</DropdownMenuItem>
      //       <DropdownMenuItem>View payment details</DropdownMenuItem>
      //     </DropdownMenuContent>
      //   </DropdownMenu>
      // );
      return (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" disabled>
            <CopyIcon />
            Copy ID
          </Button>
        </div>
      );
    },
  },
];

export function MyTablePage() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: sampleData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <>
      <PageHeader title="Table" breadcrumbs={[{ label: "Home", href: "/" }]} />
      <div className="p-4 space-y-4">
        <div className="flex items-center">
          <Input
            placeholder="Filter..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("email")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
