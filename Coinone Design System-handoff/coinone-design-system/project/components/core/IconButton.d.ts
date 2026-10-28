import * as React from "react";

/**
 * Circular icon-only button. Pass an inline SVG as children (inherits currentColor).
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** overlay = semi-transparent dark on imagery · ghost = on white · tint = surface fill. @default "ghost" */
  variant?: "overlay" | "ghost" | "tint";
  /** Diameter in px. @default 36 */
  size?: number;
  /** Accessible label (aria-label). */
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function IconButton(props: IconButtonProps): JSX.Element;
