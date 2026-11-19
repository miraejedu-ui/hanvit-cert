"use client";

const CUSTOM = "__custom__";

export type PresetOption = {
  value: string;
  label: string;
};

type Props = {
  options: PresetOption[];
  value: string;
  onChange: (value: string) => void;
  customLabel?: string;
  customPlaceholder?: string;
  inputType?: "text" | "number";
  disabled?: boolean;
  /** Show fixed value only (no select / custom) */
  fixed?: boolean;
  required?: boolean;
};

/**
 * Select a preset value, or switch to a custom text/number input.
 * When `value` is not in `options`, the custom mode is active.
 */
export function PresetOrCustom({
  options,
  value,
  onChange,
  customLabel = "직접 입력",
  customPlaceholder = "직접 입력",
  inputType = "text",
  disabled = false,
  fixed = false,
  required = false,
}: Props) {
  if (fixed) {
    return (
      <input
        value={value}
        readOnly
        disabled={disabled}
        required={required}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          borderRadius: "0.55rem",
          padding: "0.7rem 0.85rem",
          background: "#f5f7fa",
          color: "var(--ink)",
        }}
      />
    );
  }

  const isPreset = options.some((o) => o.value === value);
  const selectValue = isPreset ? value : CUSTOM;

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <select
        value={selectValue}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM) {
            onChange("");
          } else {
            onChange(next);
          }
        }}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          borderRadius: "0.55rem",
          padding: "0.7rem 0.85rem",
          background: "#fff",
        }}
      >
        <option value="" disabled>
          선택
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={CUSTOM}>{customLabel}</option>
      </select>
      {!isPreset && (
        <input
          type={inputType}
          value={value}
          disabled={disabled}
          required={required}
          placeholder={customPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid var(--line)",
            borderRadius: "0.55rem",
            padding: "0.7rem 0.85rem",
            background: "#fff",
          }}
        />
      )}
      {isPreset && required && (
        <input tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0 }} value={value} required readOnly />
      )}
    </div>
  );
}
