"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchOption = {
  value: string;
  label: string;
  keywords?: string;
};

type Props = {
  options: SearchOption[];
  value: string;
  onChange: (value: string, option?: SearchOption) => void;
  placeholder?: string;
  /** true면 목록에 없어도 직접 입력한 값을 사용 */
  allowCustom?: boolean;
  required?: boolean;
  disabled?: boolean;
};

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "검색하거나 선택하세요",
  allowCustom = false,
  required = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = open ? query : selected?.label || (allowCustom ? value : "") || "";

  useEffect(() => {
    if (!open) {
      setQuery(selected?.label || (allowCustom ? value : "") || "");
    }
  }, [value, selected, allowCustom, open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => {
        const hay = `${o.label} ${o.keywords || ""} ${o.value}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [options, query]);

  function pick(opt: SearchOption) {
    onChange(opt.value, opt);
    setQuery(opt.label);
    setOpen(false);
  }

  function commitCustom() {
    if (!allowCustom) {
      if (selected) setQuery(selected.label);
      else {
        const hit = options.find(
          (o) => o.label.toLowerCase() === query.trim().toLowerCase()
        );
        if (hit) pick(hit);
        else setQuery("");
      }
      setOpen(false);
      return;
    }
    const text = query.trim();
    const hit = options.find(
      (o) => o.label.toLowerCase() === text.toLowerCase() || o.value === text
    );
    if (hit) pick(hit);
    else {
      onChange(text);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        value={display}
        disabled={disabled}
        required={required && !value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery(selected?.label || (allowCustom ? value : "") || "");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (allowCustom) onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[0]) pick(filtered[0]);
            else commitCustom();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        onBlur={() => {
          // delay so click on option registers
          setTimeout(commitCustom, 120);
        }}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          borderRadius: "0.55rem",
          padding: "0.7rem 0.85rem",
          background: "#fff",
        }}
      />
      {/* hidden value for required native check when not allowCustom */}
      {!allowCustom && (
        <input tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0 }} value={value} required={required} readOnly />
      )}
      {open && (
        <ul
          style={{
            position: "absolute",
            zIndex: 30,
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            margin: 0,
            padding: "0.35rem",
            listStyle: "none",
            maxHeight: 240,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: "0.55rem",
            boxShadow: "0 8px 24px rgba(15, 40, 70, 0.12)",
          }}
        >
          {filtered.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  background: o.value === value ? "var(--teal-soft)" : "transparent",
                  padding: "0.55rem 0.65rem",
                  borderRadius: "0.4rem",
                  cursor: "pointer",
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li style={{ padding: "0.65rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              {allowCustom ? "목록에 없음 — 입력한 내용을 그대로 사용합니다" : "검색 결과 없음"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
