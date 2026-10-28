import * as React from "react";

/**
 * Centered modal over a dim scrim. Soft short shadow, 10px radius.
 */
export interface DialogProps {
  open: boolean;
  /** Called on scrim click / close button. */
  onClose?: () => void;
  title?: React.ReactNode;
  /** Footer action row (right-aligned), e.g. cancel + primary Button. */
  footer?: React.ReactNode;
  /** Dialog width in px. @default 420 */
  width?: number;
  children?: React.ReactNode;
}

export function Dialog(props: DialogProps): JSX.Element | null;
