import * as React from "react";
import { cn } from "../../lib/utils";

/* ─── Primitive table parts ─── */

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

/* ─── SortIcon ─── */

export interface SortIconProps {
  active: boolean;
  direction: "asc" | "desc";
}

function SortIcon({ active, direction }: SortIconProps) {
  return (
    <span className="inline-flex flex-col ml-1">
      <svg
        className={cn(
          "h-3 w-3 -mb-1",
          active && direction === "asc" ? "text-primary" : "text-muted-foreground/30"
        )}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 5l7 7H5z" />
      </svg>
      <svg
        className={cn(
          "h-3 w-3",
          active && direction === "desc" ? "text-primary" : "text-muted-foreground/30"
        )}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 19l-7-7h14z" />
      </svg>
    </span>
  );
}

/* ─── DataTable (high-level convenience) ─── */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Nessun dato disponibile",
  onRowClick,
  sortKey,
  sortDirection = "asc",
  onSort,
}: DataTableProps<T>) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(
                "text-xs font-bold uppercase tracking-wide",
                alignClasses[col.align || "left"],
                col.sortable && onSort && "cursor-pointer select-none"
              )}
              onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
            >
              <span className="inline-flex items-center">
                {col.header}
                {col.sortable && onSort && (
                  <SortIcon
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDirection : "asc"}
                  />
                )}
              </span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={keyExtractor(item)}
            className={cn(onRowClick && "cursor-pointer")}
            onClick={onRowClick ? () => onRowClick(item) : undefined}
          >
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={alignClasses[col.align || "left"]}
              >
                {col.render
                  ? col.render(item)
                  : String((item as Record<string, unknown>)[col.key] ?? "")}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SortIcon,
  DataTable,
};
