import * as React from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
}

/**
 * Underline tab bar. Active tab = near-black bold label + 2px blue underline.
 */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: TabItem[];
  /** Controlled active id. Omit for uncontrolled. */
  value?: string;
  onChange?: (id: string) => void;
}

export function Tabs(props: TabsProps): JSX.Element;
