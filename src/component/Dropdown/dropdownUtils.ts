import type { CSSProperties } from "react";

export type DropdownPosition = {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
};

export const DROPDOWN_FONT = '"Shabnam", Arial, Helvetica, sans-serif';

export function normalizeDropdownSearch(value: unknown) {
    return String(value ?? "")
        .toLocaleLowerCase("fa-IR")
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/ۀ|ة/g, "ه")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

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
    const horizontalMargin = 12;
    const verticalGap = 6;
    const requestedWidth = Math.max(
        rect.width,
        Math.min(preferredWidth ?? rect.width, viewportWidth - 24),
    );
    const width = Math.min(
        requestedWidth,
        viewportWidth - horizontalMargin * 2,
    );
    const left = Math.min(
        Math.max(horizontalMargin, rect.right - width),
        viewportWidth - width - horizontalMargin,
    );
    const spaceBelow = viewportHeight - rect.bottom - verticalGap - 10;
    const spaceAbove = rect.top - verticalGap - 10;
    const openAbove = spaceBelow < 190 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(120, openAbove ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(310, availableHeight);
    const top = openAbove
        ? Math.max(10, rect.top - maxHeight - verticalGap)
        : Math.min(viewportHeight - 10, rect.bottom + verticalGap);

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
        fontFamily: DROPDOWN_FONT,
        fontWeight: 400,
    };
}
