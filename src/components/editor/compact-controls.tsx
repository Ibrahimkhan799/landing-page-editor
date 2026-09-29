"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const numericValue = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;

export function normalizeCssLength(value: string, defaultUnit = "px", allowAuto = false) {
  const next = value.trim();
  if (!next) return "";
  if (allowAuto && next.toLowerCase() === "auto") return "auto";
  const match = next.match(numericValue);
  if (!match) return next;
  return `${match[1]}${match[2] || defaultUnit}`;
}

export function MiniInput({
  value,
  onChange,
  suffix,
  className,
  width = "w-11",
}: {
  value: string | number;
  onChange: (value: string) => void;
  suffix?: string;
  className?: string;
  width?: string;
}) {
  return (
    <label className={cn(
            "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-[3px] bg-zinc-100 pr-2 dark:bg-zinc-800",
            width,
            className,
          )}>
      <input
        data-editor-mini
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        className="h-5 min-w-0 flex-1 border-0 px-1 text-right font-mono text-[10px] leading-none text-zinc-700 outline-none dark:text-zinc-200"
      />
      {suffix ? <span className="shrink-0 font-mono text-[9px] leading-none text-zinc-400">{suffix}</span> : null}
    </label>
  );
}

export function LengthInput({
  value,
  onChange,
  defaultUnit = "px",
  allowAuto = false,
  placeholder,
  prefix,
  ariaLabel,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  defaultUnit?: string;
  allowAuto?: boolean;
  placeholder?: string;
  prefix?: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const raw = value ?? "";
  const parsed = raw.trim().match(numericValue);
  const displayed = parsed?.[1] ?? raw;
  const unit = parsed?.[2] || defaultUnit;

  function commit(next: string) {
    const normalized = normalizeCssLength(next, parsed?.[2] || defaultUnit, allowAuto);
    if (normalized !== next) onChange(normalized);
  }

  function step(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      commit(event.currentTarget.value);
      event.currentTarget.blur();
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const match = event.currentTarget.value.trim().match(numericValue);
    if (!match) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
    const direction = event.key === "ArrowUp" ? 1 : -1;
    const next = Math.round((Number.parseFloat(match[1]) + amount * direction) * 100) / 100;
    onChange(`${next}${match[2] || unit}`);
  }

  return (
    <label
      className={cn(
        "flex h-6 min-w-0 items-center rounded-[3px] bg-zinc-100 text-zinc-500 ring-1 ring-transparent focus-within:bg-white focus-within:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:focus-within:bg-zinc-800 dark:focus-within:ring-zinc-600",
        className,
      )}
    >
      {prefix ? <span className="grid w-6 shrink-0 place-items-center text-[9px] font-medium">{prefix}</span> : null}
      <input
        value={displayed}
        inputMode="decimal"
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={step}
        className="h-6 min-w-0 flex-1 border-0 bg-transparent px-1.5 font-mono text-[10px] text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      {parsed ? <span className="shrink-0 pr-1.5 font-mono text-[9px] text-zinc-400">{unit}</span> : null}
    </label>
  );
}

type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type DimensionMode = "px" | "%" | "fill" | "auto" | "custom";

function dimensionMode(value: string): DimensionMode {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "auto") return "auto";
  if (trimmed === "100%") return "fill";
  if (/^-?(?:\d+\.?\d*|\.\d+)px$/i.test(trimmed)) return "px";
  if (/^-?(?:\d+\.?\d*|\.\d+)%$/.test(trimmed)) return "%";
  return "custom";
}

export function DimensionInput({
  value,
  onChange,
  ariaLabel,
  allowFill = true,
}: {
  value?: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  allowFill?: boolean;
}) {
  const raw = value ?? "";
  const mode = dimensionMode(raw);
  const numeric = mode === "px" || mode === "%" ? raw.replace(/(?:px|%)$/i, "") : "";

  function changeMode(next: DimensionMode) {
    const fallback = Number.parseFloat(raw) || 100;
    if (next === "fill") onChange("100%");
    else if (next === "auto") onChange("");
    else if (next === "px") onChange(`${fallback}px`);
    else if (next === "%") onChange(`${Math.min(100, fallback)}%`);
  }

  return (
    <div className="flex h-6 min-w-0 items-center overflow-hidden rounded-[3px] bg-zinc-100 ring-1 ring-transparent focus-within:bg-white focus-within:ring-zinc-300 dark:bg-zinc-800 dark:focus-within:bg-zinc-800 dark:focus-within:ring-zinc-600">
      {mode === "custom" ? (
        <input
          value={raw}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 min-w-0 flex-1 border-0 bg-transparent px-1.5 font-mono text-[10px] text-zinc-700 outline-none dark:text-zinc-100"
        />
      ) : mode === "fill" || mode === "auto" ? (
        <span className="min-w-0 flex-1 truncate px-1.5 text-[10px] text-zinc-600 dark:text-zinc-300">
          {mode === "fill" ? "Fill container" : "Auto"}
        </span>
      ) : (
        <input
          value={numeric}
          inputMode="decimal"
          aria-label={ariaLabel}
          onChange={(event) => onChange(`${event.target.value}${mode}`)}
          className="h-6 min-w-0 flex-1 border-0 bg-transparent px-1.5 font-mono text-[10px] text-zinc-700 outline-none dark:text-zinc-100"
        />
      )}
      <select
        aria-label={`${ariaLabel} sizing mode`}
        value={mode}
        onChange={(event) => changeMode(event.target.value as DimensionMode)}
        className="h-6 w-[52px] shrink-0 border-0 border-l border-zinc-200 bg-transparent px-1 text-[9px] text-zinc-500 outline-none dark:border-zinc-700 dark:text-zinc-300"
      >
        <option value="px">px</option>
        <option value="%">%</option>
        {allowFill ? <option value="fill">Fill</option> : null}
        <option value="auto">Auto</option>
        {mode === "custom" ? <option value="custom">Custom</option> : null}
      </select>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex h-6 min-w-0 items-center rounded-[4px] bg-zinc-100 p-0.5 dark:bg-zinc-800", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          aria-label={option.label}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "grid h-5 min-w-0 flex-1 place-items-center rounded-[3px] px-1 text-[10px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            value === option.value && "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50",
          )}
        >
          {option.icon ?? option.label}
        </button>
      ))}
    </div>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {label ? <span className="w-10 shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">{label}</span> : null}
      <div className="min-w-0 flex-1">
        <Slider min={min} max={max} step={step} value={[value]} onValueChange={([next]) => onChange(next ?? min)} />
      </div>
      <MiniInput
        value={Number.isInteger(step) && step >= 1 ? Math.round(value) : Number(value.toFixed(2))}
        suffix={suffix}
        onChange={(next) => {
          const numeric = Number.parseFloat(next);
          if (Number.isFinite(numeric)) onChange(numeric);
        }}
      />
    </div>
  );
}
