import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Column<T> {
  key: string;
  header: string;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = "No data found",
  onRowClick,
  getRowKey,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={getRowKey(item)}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={() => onRowClick?.(item)}
              data-testid={`row-${getRowKey(item)}`}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell
                    ? column.cell(item)
                    : (item as Record<string, unknown>)[column.key]?.toString() || ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
