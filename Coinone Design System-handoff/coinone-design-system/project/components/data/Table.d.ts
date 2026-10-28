import * as React from "react";

export interface TableColumn {
  /** Field key on each row object. */
  key: string;
  /** Header label. */
  header: React.ReactNode;
  /** Cell alignment — use "right" for numeric columns. @default "left" */
  align?: "left" | "right" | "center";
  /** Optional custom cell renderer. */
  render?: (value: any, row: Record<string, any>) => React.ReactNode;
}

/**
 * Dense data table for market / list rows. Numeric columns run right-aligned,
 * tabular, and weighted. Hairline row dividers, no card shadow.
 */
export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  columns: TableColumn[];
  rows: Array<Record<string, any>>;
  onRowClick?: (row: Record<string, any>) => void;
}

export function Table(props: TableProps): JSX.Element;
