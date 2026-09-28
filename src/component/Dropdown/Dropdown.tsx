"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Dropdown.module.css";
import type { CommonDropdownProps, DropdownValue } from "./types";
import { createDropdownMenuStyle, getDropdownPosition, type DropdownPosition } from "./dropdownUtils";

export type DropdownProps<T extends DropdownValue = string> = CommonDropdownProps<T> & {
  menuWidth?: number;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={open ? styles.chevronOpen : ""} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 12 4 4 8-9" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg className={styles.spin} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    </svg>
  );
}

export default function Dropdown<T extends DropdownValue = string>({
  value,
  options,
  onChange,
  placeholder = "انتخاب کنید",
  emptyText = "گزینه‌ای برای انتخاب وجود ندارد.",
  disabled = false,
  loading = false,
  loadingText = "در حال دریافت...",
  className = "",
  ariaLabel = "انتخاب گزینه",
  leadingIcon,
  dropdownZIndex = 2147483000,
  menuWidth,
  error = false,
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

  function updatePosition() {
    setPosition(getDropdownPosition(rootRef, menuWidth));
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
    if (disabled || loading) setOpen(false);
  }, [disabled, loading]);

  const menu = open && mounted && !disabled && !loading
    ? createPortal(
        <div
          ref={menuRef}
          id={listId}
          className={styles.menu}
          role="listbox"
          aria-label={ariaLabel}
          style={createDropdownMenuStyle(position, dropdownZIndex)}
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
                  className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className={styles.optionText}>
                    <strong>{option.label}</strong>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {selected ? <span className={styles.check}><CheckIcon /></span> : null}
                </button>
              );
            })
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={`${styles.root} ${className}`} dir="rtl">
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${error ? styles.triggerError : ""}`}
        onClick={() => {
          if (disabled || loading) return;
          if (open) {
            setOpen(false);
          } else {
            updatePosition();
            setOpen(true);
          }
        }}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {loading ? <span className={styles.loading}><LoadingIcon /></span> : leadingIcon}
        <span className={`${styles.triggerText} ${selectedOption ? "" : styles.placeholder}`}>
          {loading ? loadingText : selectedOption?.label ?? placeholder}
        </span>
        <span className={styles.chevron}><ChevronIcon open={open} /></span>
      </button>
      {menu}
    </div>
  );
}
