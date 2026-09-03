"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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
    <label className={cn("inline-flex h-5 shrink-0 items-center gap-0.5", width, className)}>
      <input
        data-editor-mini
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        className="h-5 min-w-0 flex-1 rounded-[3px] border-0 bg-zinc-100 px-1 text-right font-mono text-[10px] leading-none text-zinc-700 outline-none"
      />
      {suffix ? <span className="shrink-0 font-mono text-[9px] leading-none text-zinc-400">{suffix}</span> : null}
    </label>
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
