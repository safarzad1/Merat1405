import type { ReactNode } from "react";

export type DropdownValue = string | number;

export type DropdownOption<T extends DropdownValue = string> = {
    value: T;
    label: string;
    description?: string;
    searchText?: string;
    disabled?: boolean;
};

export type CommonDropdownProps<T extends DropdownValue> = {
    value: T | null | undefined;
    options: DropdownOption<T>[];
    onChange: (value: T) => void;
    placeholder?: string;
    emptyText?: string;
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
    compact?: boolean;
    className?: string;
    ariaLabel?: string;
    leadingIcon?: ReactNode;
    dropdownZIndex?: number;
};
