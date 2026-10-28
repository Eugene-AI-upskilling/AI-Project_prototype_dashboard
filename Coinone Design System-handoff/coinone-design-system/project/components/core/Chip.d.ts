import * as React from "react";

/**
 * Filter / toggle chip. Active = near-black border + bold weight (no fill change).
 */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default false */
  active?: boolean;
  children?: React.ReactNode;
}

export function Chip(props: ChipProps): JSX.Element;
