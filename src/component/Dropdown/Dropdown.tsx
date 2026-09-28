"use client";

import {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";

import styles from "./Dropdown.module.css";
import type { CommonDropdownProps, DropdownValue } from "./types";
import {
    createDropdownMenuStyle,
    getDropdownPosition,
    type DropdownPosition,
} from "./dropdownUtils";

export type DropdownProps<T extends DropdownValue = string> =
    CommonDropdownProps<T> & {
        menuWidth?: number;
    };

export default function Dropdown<T extends DropdownValue = string>({
    value,
    options,
    onChange,
    placeholder = "انتخاب کنید",
    emptyText = "گزینه‌ای برای انتخاب وجود ندارد.",
    disabled = false,
    loading = false,
    loadingText = "در حال دریافت...",
    compact = false,
    className = "",
    ariaLabel = "انتخاب گزینه",
    leadingIcon,
    dropdownZIndex = 2147483000,
    menuWidth,
}: DropdownProps<T>) {
    const generatedId = useId().replace(/:/g, "");
    const listId = `dropdown-list-${generatedId}`;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<DropdownPosition>({
        top: 0,
        left: 0,
        width: 280,
        maxHeight: 280,
    });

    const normalizedOptions = useMemo(() => {
        const unique = new Map<T, (typeof options)[number]>();
        for (const option of options) unique.set(option.value, option);
        return Array.from(unique.values());
    }, [options]);

    const selectedOption = useMemo(
        () => normalizedOptions.find((option) => option.value === value),
        [normalizedOptions, value],
    );

    const updatePosition = () => {
        setPosition(getDropdownPosition(rootRef, menuWidth));
    };

    const closeDropdown = () => setOpen(false);

    const openDropdown = () => {
        if (disabled || loading) return;
        updatePosition();
        setOpen(true);
    };

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return;

        const closeOnOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (
                !rootRef.current?.contains(target) &&
                !menuRef.current?.contains(target)
            ) {
                closeDropdown();
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeDropdown();
        };
        const handleViewportChange = () => updatePosition();

        document.addEventListener("mousedown", closeOnOutside);
        document.addEventListener("touchstart", closeOnOutside);
        document.addEventListener("keydown", closeOnEscape);
        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("scroll", handleViewportChange, true);

        return () => {
            document.removeEventListener("mousedown", closeOnOutside);
            document.removeEventListener("touchstart", closeOnOutside);
            document.removeEventListener("keydown", closeOnEscape);
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("scroll", handleViewportChange, true);
        };
    }, [open, menuWidth]);

    useEffect(() => {
        if (disabled || loading) closeDropdown();
    }, [disabled, loading]);

    const menu =
        open && mounted && !disabled && !loading
            ? createPortal(
                  <div
                      ref={menuRef}
                      id={listId}
                      className={styles.menu}
                      role="listbox"
                      aria-label={ariaLabel}
                      style={createDropdownMenuStyle(
                          position,
                          dropdownZIndex,
                      )}
                      dir="rtl"
                  >
                      {normalizedOptions.length === 0 ? (
                          <div className={styles.empty}>{emptyText}</div>
                      ) : (
                          normalizedOptions.map((option) => {
                              const selected = option.value === value;
                              return (
                                  <button
                                      key={String(option.value)}
                                      type="button"
                                      role="option"
                                      aria-selected={selected}
                                      className={`${styles.option} ${
                                          selected ? styles.optionSelected : ""
                                      }`}
                                      disabled={option.disabled}
                                      onClick={() => {
                                          if (option.disabled) return;
                                          onChange(option.value);
                                          closeDropdown();
                                      }}
                                  >
                                      <span className={styles.optionText}>
                                          <strong>{option.label}</strong>
                                          {option.description && (
                                              <small>{option.description}</small>
                                          )}
                                      </span>
                                      {selected && (
                                          <Check size={15} aria-hidden="true" />
                                      )}
                                  </button>
                              );
                          })
                      )}
                  </div>,
                  document.body,
              )
            : null;

    return (
        <div
            ref={rootRef}
            className={`${styles.root} ${compact ? styles.compact : ""} ${className}`}
            dir="rtl"
        >
            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
                onClick={() => (open ? closeDropdown() : openDropdown())}
                disabled={disabled || loading}
                aria-haspopup="listbox"
                aria-controls={listId}
                aria-expanded={open}
                aria-label={ariaLabel}
            >
                {loading ? (
                    <LoaderCircle
                        size={16}
                        className={styles.spin}
                        aria-hidden="true"
                    />
                ) : (
                    leadingIcon
                )}
                <span
                    className={`${styles.triggerText} ${
                        selectedOption ? "" : styles.placeholder
                    }`}
                >
                    {loading
                        ? loadingText
                        : selectedOption?.label ?? placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={styles.chevron}
                    aria-hidden="true"
                />
            </button>
            {menu}
        </div>
    );
}
