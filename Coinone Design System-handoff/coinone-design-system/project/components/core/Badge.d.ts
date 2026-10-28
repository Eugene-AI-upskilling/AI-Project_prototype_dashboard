import * as React from "react";

/**
 * Small status / label pill. `up`/`down` follow KR trading convention (up=red, down=blue).
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "neutral" */
  tone?: "neutral" | "brand" | "point" | "up" | "down" | "muted";
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
