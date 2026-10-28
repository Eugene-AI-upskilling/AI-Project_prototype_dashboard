import * as React from "react";

/**
 * Flat white surface — hairline border, 8px radius, low elevation.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional header title. */
  title?: React.ReactNode;
  /** Right-aligned header action (e.g. a text Button). */
  action?: React.ReactNode;
  /** Add the soft floating shadow. @default false */
  elevated?: boolean;
  /** Body padding in px. @default 20 */
  padding?: number;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
