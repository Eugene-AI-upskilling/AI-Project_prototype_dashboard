import React from "react";

/**
 * Coinone Dialog — centered modal over a dim scrim. Soft short shadow, 10px
 * radius. Title + optional close, body content, and a footer action row.
 * Renders nothing when open is false.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 420,
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,5,5,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 1000,
        animation: "cnFade var(--dur-toggle) var(--ease-out)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: "100%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-pop)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px 0" }}>
          <h3 style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: "var(--color-foreground)" }}>
            {title}
          </h3>
          {onClose && (
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", padding: 4, lineHeight: 0 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ padding: "12px 22px 20px", fontSize: "var(--text-body)", color: "var(--color-body)", lineHeight: "var(--leading-body)" }}>
          {children}
        </div>
        {footer && (
          <div style={{ display: "flex", gap: "var(--space-sm)", padding: "0 22px 22px", justifyContent: "flex-end" }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes cnFade{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
