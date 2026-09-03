"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function MiniInput({
  value,
  onChange,
  suffix,
  className,
  width = "w-9",
}: {
  value: string | number;
  onChange: (value: string) => void;
  suffix?: string;
  className?: string;
  width?: string;
}) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-[3px] bg-zinc-100 px-1", width, className)}>
      <input
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-right font-mono text-[10px] text-zinc-700 outline-none"
      />
      {suffix ? <span className="pl-0.5 font-mono text-[9px] text-zinc-400">{suffix}</span> : null}
    </span>
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
    <div className="flex items-center gap-2">
      {label ? <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">{label}</span> : null}
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([next]) => onChange(next ?? min)} />
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
