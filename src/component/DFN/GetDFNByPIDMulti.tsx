"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DFNByPID } from "@/services/ApiService";

type Item = { NameFarsi: string; Value: number };
type Props = {
  PID: number;
  label?: string;
  placeholder?: string;
  defaultValue?: number[] | number;
  name?: string;
  onSelect?: (items: Item[] | null) => void;
  onChange?: (e: any) => void;
  error?: boolean;
  errorMessage?: string;
  labelColor?: string;
  required?: boolean;
  requiredStarColor?: string;
  isDisabled?: boolean;
  closeMenuOnSelect?: boolean;
  instanceId?: string;
};

function normalizeArrayResult(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.recordset)) return result.recordset;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.recordset)) return result.data.recordset;
  if (Array.isArray(result?.result)) return result.result;
  return [];
}

export default function GetDFNByPIDMulti({
  PID,
  label,
  placeholder = "انتخاب کنید...",
  defaultValue,
  name,
  onSelect,
  onChange,
  error,
  errorMessage,
  labelColor = "",
  required = false,
  requiredStarColor = "",
  isDisabled = false,
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let mounted = true;
    if (!PID) {
      setItems([]);
      setValues([]);
      return;
    }
    setLoading(true);
    DFNByPID(PID)
      .then((result: any) => {
        if (!mounted) return;
        const mapped = normalizeArrayResult(result)
          .map((i: any) => ({
            NameFarsi: String(i?.NameFarsi ?? i?.nameFarsi ?? i?.Title ?? i?.label ?? "").trim(),
            Value: Number(i?.Value ?? i?.value),
          }))
          .filter((x: Item) => x.NameFarsi && Number.isFinite(x.Value));
        setItems(mapped);
      })
      .catch(() => mounted && setItems([]))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [PID]);

  useEffect(() => {
    const next = defaultValue == null
      ? []
      : (Array.isArray(defaultValue) ? defaultValue : [defaultValue]).map(Number).filter(Number.isFinite);
    setValues(next);
  }, [defaultValue]);

  const selected = useMemo(() => items.filter((i) => values.includes(i.Value)), [items, values]);

  const toggle = (value: number) => {
    if (isDisabled) return;
    const next = values.includes(value) ? values.filter((x) => x !== value) : [...values, value];
    setValues(next);
    const payload = items.filter((i) => next.includes(i.Value));
    onSelectRef.current?.(payload.length ? payload : null);
    onChangeRef.current?.({ target: { name, value: next } });
  };

  return (
    <div className="research-field davtalab-field">
      {label ? (
        <label className={labelColor}>
          {label}
          {required ? <span className={`research-required ${requiredStarColor}`}>*</span> : null}
        </label>
      ) : null}
      <div className={`davtalab-multiselect ${error ? "error" : ""} ${isDisabled ? "disabled" : ""}`}>
        {loading ? (
          <span className="davtalab-muted">در حال دریافت...</span>
        ) : items.length ? (
          items.map((item) => (
            <button
              key={item.Value}
              type="button"
              disabled={isDisabled}
              className={values.includes(item.Value) ? "selected" : ""}
              onClick={() => toggle(item.Value)}
            >
              {item.NameFarsi}
            </button>
          ))
        ) : (
          <span className="davtalab-muted">{placeholder}</span>
        )}
      </div>
      {selected.length ? <div className="davtalab-selected-summary">{selected.map((x) => x.NameFarsi).join("، ")}</div> : null}
      {errorMessage ? <small className="research-error">{errorMessage}</small> : null}
    </div>
  );
}
