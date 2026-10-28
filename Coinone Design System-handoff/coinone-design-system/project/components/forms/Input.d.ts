import * as React from "react";

/**
 * Labeled text field with helper / error. Focus ring = accent outline blue;
 * error turns border + helper red.
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  /** Field label rendered above the control. */
  label?: string;
  /** Muted helper text under the field. */
  helper?: string;
  /** Error message — turns border + text red and overrides helper. */
  error?: string;
  /** Trailing adornment (e.g. "KRW"). */
  suffix?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
