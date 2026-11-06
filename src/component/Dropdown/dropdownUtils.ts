import type { CSSProperties } from "react";

export type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function getDropdownPosition(
  rootRef: { current: HTMLElement | null },
  preferredWidth?: number,
  preferredMaxHeight?: number,
  verticalGap = 5,
  // Estimated natural menu height. Short lists should not flip above just
  // because there is less than 180px under the trigger.
  contentHeight?: number,
): DropdownPosition {
  const root = rootRef.current;
  if (!root || typeof window === "undefined") {
    return { top: 0, left: 0, width: 280, maxHeight: 280 };
  }

  const rect = root.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalMargin = 10;
  const requestedWidth = Math.max(
    rect.width,
    Math.min(preferredWidth ?? rect.width, viewportWidth - 20),
  );
  const width = Math.min(requestedWidth, viewportWidth - horizontalMargin * 2);
  const left = Math.min(
    Math.max(horizontalMargin, rect.right - width),
    viewportWidth - width - horizontalMargin,
  );
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - verticalGap - 8);
  const spaceAbove = Math.max(0, rect.top - verticalGap - 8);
  // Use the actual length of the list (when known), not a fixed threshold.
  // E.g. a one-item dropdown needs ~50px and should open BELOW if 80px
  // is free, even though a 300px dropdown would need to open above.
  const requestedHeight = Math.min(300, preferredMaxHeight ?? 300, contentHeight ?? 300);
  const openAbove = spaceBelow < requestedHeight && spaceAbove > spaceBelow;
  const availableHeight = openAbove ? spaceAbove : spaceBelow;
  // The popup is portaled and floating; don't force a 120px minimum
  // if there is less room (it would overlap the modal footer).
  const maxHeight = Math.max(24, Math.min(requestedHeight, availableHeight));
  const top = openAbove
    ? Math.max(8, rect.top - maxHeight - verticalGap)
    : Math.min(viewportHeight - maxHeight - 8, rect.bottom + verticalGap);

  return { top, left, width, maxHeight };
}

export function createDropdownMenuStyle(
  position: DropdownPosition,
  zIndex: number,
): CSSProperties {
  return {
    top: position.top,
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
    zIndex,
  };
}

/** Normalize Persian and Arabic variants before matching dropdown options. */
export function normalizeDropdownSearch(value: string): string {
  return String(value ?? "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\u064B-\u065F\u0670\u200C\u200D]/g, "")
    .trim()
    .toLocaleLowerCase();
}
