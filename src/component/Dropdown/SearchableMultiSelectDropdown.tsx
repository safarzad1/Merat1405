"use client";

import {
  type CSSProperties,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";

import styles from "./Dropdown.module.css";
import type { DropdownOption, DropdownValue } from "./types";
import {
  createDropdownMenuStyle,
  getDropdownPosition,
  normalizeDropdownSearch,
  type DropdownPosition,
} from "./dropdownUtils";

export type SearchableMultiSelectDropdownProps<
  T extends DropdownValue = string,
> = {
  values: T[];
  options: DropdownOption<T>[];
  onChange: (values: T[]) => void;

  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  noResultText?: string;

  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;

  compact?: boolean;
  className?: string;
  ariaLabel?: string;
  leadingIcon?: React.ReactNode;

  dropdownZIndex?: number;
  menuWidth?: number;
  itemFontSize?: string;

  maxSelections?: number;
  closeOnSelect?: boolean;
  selectedCountLabel?: string;
};

export default function SearchableMultiSelectDropdown<
  T extends DropdownValue = string,
>({
  values,
  options,
  onChange,
  placeholder = "جست‌وجو و انتخاب کنید",
  searchPlaceholder = "جست‌وجوی نام یا کد...",
  emptyText = "گزینه‌ای برای انتخاب وجود ندارد.",
  noResultText = "موردی پیدا نشد.",
  disabled = false,
  loading = false,
  loadingText = "در حال دریافت...",
  compact = false,
  className = "",
  ariaLabel = "انتخاب چند گزینه",
  leadingIcon,
  dropdownZIndex = 2147483000,
  menuWidth,
  itemFontSize = "12px",
  maxSelections,
  closeOnSelect,
  selectedCountLabel = "انتخاب‌شده",
}: SearchableMultiSelectDropdownProps<T>) {
  const generatedId = useId().replace(/:/g, "");
  const listId = `searchable-multi-dropdown-list-${generatedId}`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 340,
    maxHeight: 330,
  });

  const normalizedOptions = useMemo(() => {
    const unique = new Map<T, DropdownOption<T>>();

    for (const option of options) {
      unique.set(option.value, option);
    }

    return Array.from(unique.values());
  }, [options]);

  const selectedSet = useMemo(() => new Set(values), [values]);

  const selectedOptions = useMemo(
    () =>
      values
        .map((value) =>
          normalizedOptions.find((option) => option.value === value),
        )
        .filter(Boolean) as DropdownOption<T>[],
    [values, normalizedOptions],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeDropdownSearch(query);

    if (!normalizedQuery) return normalizedOptions;

    return normalizedOptions.filter((option) =>
      normalizeDropdownSearch(
        `${option.label} ${option.description ?? ""} ${
          option.searchText ?? ""
        }`,
      ).includes(normalizedQuery),
    );
  }, [normalizedOptions, query]);

  const updatePosition = () => {
    setPosition(getDropdownPosition(rootRef, menuWidth ?? 420));
  };

  const closeDropdown = () => {
    setOpen(false);
    setQuery("");
  };

  const openDropdown = () => {
    if (disabled || loading) return;

    updatePosition();
    setOpen(true);

    window.setTimeout(() => inputRef.current?.focus(), 0);
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

  const toggleValue = (option: DropdownOption<T>) => {
    if (option.disabled) return;

    const selected = selectedSet.has(option.value);

    if (selected) {
      onChange(values.filter((value) => value !== option.value));
      return;
    }

    if (maxSelections === 1) {
      onChange([option.value]);

      if (closeOnSelect !== false) {
        closeDropdown();
      }

      return;
    }

    if (
      typeof maxSelections === "number" &&
      maxSelections > 0 &&
      values.length >= maxSelections
    ) {
      return;
    }

    onChange([...values, option.value]);

    if (closeOnSelect === true) {
      closeDropdown();
    }
  };

  const menu =
    open && mounted && !disabled && !loading
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            className={`${styles.searchMenu} ${styles.multiSearchMenu}`}
            role="listbox"
            aria-multiselectable={maxSelections !== 1}
            aria-label={ariaLabel}
            style={{
              ...createDropdownMenuStyle(position, dropdownZIndex),
              "--dropdown-item-font-size": itemFontSize,
            } as CSSProperties}
            dir="rtl"
          >
            <div className={styles.searchBox}>
              <Search size={16} aria-hidden="true" />

              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />

              {query && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="پاک کردن جست‌وجو"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className={styles.multiSelectedInfo}>
              <span>
                {selectedCountLabel}: {values.length}
                {maxSelections === 1 ? " / 1" : ""}
              </span>

              {values.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  disabled={disabled}
                >
                  پاک کردن انتخاب‌ها
                </button>
              )}
            </div>

            <div className={styles.optionList}>
              {normalizedOptions.length === 0 ? (
                <div className={styles.empty}>{emptyText}</div>
              ) : filteredOptions.length === 0 ? (
                <div className={styles.empty}>{noResultText}</div>
              ) : (
                filteredOptions.map((option) => {
                  const selected = selectedSet.has(option.value);

                  const maxReached =
                    !selected &&
                    typeof maxSelections === "number" &&
                    maxSelections > 0 &&
                    values.length >= maxSelections;

                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`${styles.option} ${
                        selected ? styles.optionSelected : ""
                      }`}
                      disabled={option.disabled || maxReached}
                      onClick={() => toggleValue(option)}
                    >
                      <span className={styles.multiOptionCheck}>
                        {selected && <Check size={14} aria-hidden="true" />}
                      </span>

                      <span className={styles.optionText}>
                        <strong>{option.label}</strong>

                        {option.description && (
                          <small>{option.description}</small>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  const firstSelected = selectedOptions[0];
  const overflowCount = Math.max(0, selectedOptions.length - 2);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${compact ? styles.compact : ""} ${className}`}
      style={{
        "--dropdown-item-font-size": itemFontSize,
      } as CSSProperties}
      dir="rtl"
    >
      <button
        type="button"
        className={`${styles.trigger} ${styles.multiTrigger} ${
          open ? styles.triggerOpen : ""
        }`}
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
          leadingIcon ?? <Search size={16} aria-hidden="true" />
        )}

        {loading ? (
          <span className={`${styles.triggerText} ${styles.placeholder}`}>
            {loadingText}
          </span>
        ) : selectedOptions.length === 0 ? (
          <span className={`${styles.triggerText} ${styles.placeholder}`}>
            {placeholder}
          </span>
        ) : (
          <span className={styles.multiTriggerSelection}>
            {selectedOptions.slice(0, 2).map((option) => (
              <span
                key={String(option.value)}
                className={styles.multiTriggerChip}
                title={option.label}
              >
                {option.label}
              </span>
            ))}

            {overflowCount > 0 && (
              <span className={styles.multiTriggerMore}>
                +{overflowCount}
              </span>
            )}
          </span>
        )}

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
