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
): DropdownPosition {
  const root = rootRef.current;
  if (!root || typeof window === "undefined") {
    return { top: 0, left: 0, width: 280, maxHeight: 280 };
  }

  const rect = root.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalMargin = 10;
  const verticalGap = 5;
  const requestedWidth = Math.max(
    rect.width,
    Math.min(preferredWidth ?? rect.width, viewportWidth - 20),
  );
  const width = Math.min(requestedWidth, viewportWidth - horizontalMargin * 2);
  const left = Math.min(
    Math.max(horizontalMargin, rect.right - width),
    viewportWidth - width - horizontalMargin,
  );
  const spaceBelow = viewportHeight - rect.bottom - verticalGap - 8;
  const spaceAbove = rect.top - verticalGap - 8;
  const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
  const availableHeight = Math.max(120, openAbove ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(300, availableHeight);
  const top = openAbove
    ? Math.max(8, rect.top - maxHeight - verticalGap)
    : Math.min(viewportHeight - 8, rect.bottom + verticalGap);

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
