import * as React from "react";

/**
 * Coinone primary / secondary / accent / text / store button.
 * One filled-blue primary action per view; everything else is outline or ghost.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "accent" | "text" | "store" | "store-dark";
  /** Control height. sm=36 · md=46 · lg=49. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to container width (mobile CTA). @default false */
  fullWidth?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
