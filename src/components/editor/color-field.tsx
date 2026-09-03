"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { hexToRgba, rgbToHex } from "@/lib/computed-styles";
import { cn } from "@/lib/utils";

function normalize(value?: string) {
  if (!value) return "";
  if (value.startsWith("#") || value.startsWith("rgb")) return rgbToHex(value) || value;
  if (value.startsWith("var(")) return "";
  return rgbToHex(value) || "";
}

function parseAlpha(value?: string) {
  if (!value) return 1;
  const match = value.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/i);
  if (!match) return 1;
  return Number(match[1]);
}

export function ColorSwatch({
  color,
  className,
  preview,
}: {
  color: string;
  className?: string;
  preview?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-4 shrink-0 rounded-[3px] border border-black/10 bg-[length:8px_8px]",
        className,
      )}
      style={{
        backgroundColor: preview ? undefined : color || undefined,
        backgroundImage: preview
          ? preview
          : color
            ? undefined
            : "linear-gradient(45deg, #d4d4d8 25%, transparent 25%, transparent 75%, #d4d4d8 75%), linear-gradient(45deg, #d4d4d8 25%, white 25%, white 75%, #d4d4d8 75%)",
        backgroundPosition: color || preview ? undefined : "0 0, 4px 4px",
      }}
    />
  );
}

export function ColorPickerBody({
  color,
  onChange,
  swatches,
}: {
  color: string;
  onChange: (value: string) => void;
  swatches?: string[];
}) {
  const hex = normalize(color) || "#ffffff";
  const alpha = parseAlpha(color);
  return (
    <div className="grid gap-2.5">
      <HexColorPicker className="color-picker !w-full" color={hex} onChange={(next) => onChange(alpha < 1 ? hexToRgba(next, alpha) : next)} />
      <div className="flex items-center gap-1.5">
        <ColorSwatch color={hex} className="size-6 rounded" />
        <HexColorInput
          prefixed
          color={hex}
          onChange={(next) => onChange(alpha < 1 ? hexToRgba(next, alpha) : next)}
          className="h-7 min-w-0 flex-1 rounded border border-zinc-200 bg-zinc-50 px-2 font-mono text-[11px] uppercase"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 text-[10px] uppercase tracking-wide text-zinc-400">Alpha</span>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[Math.round(alpha * 100)]}
          onValueChange={([next]) => onChange(hexToRgba(hex, next / 100))}
        />
        <span className="w-8 text-right font-mono text-[11px] text-zinc-500">{Math.round(alpha * 100)}</span>
      </div>
      {swatches?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              title={swatch}
              className="size-5 rounded-sm border border-black/10"
              style={{ background: swatch }}
              onClick={() => onChange(swatch)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ColorField({
  label,
  value,
  resolved,
  onChange,
  compact,
  swatches,
}: {
  label: string;
  value?: string;
  resolved?: string;
  onChange: (value: string) => void;
  compact?: boolean;
  swatches?: string[];
}) {
  const stored = normalize(value);
  const live = stored || normalize(resolved);
  const inherited = !stored && Boolean(live);

  return (
    <div className={cn("grid gap-1.5", compact && "gap-0")}>
      {compact ? null : (
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-zinc-500">{label}</Label>
          {inherited ? <span className="text-[10px] uppercase tracking-wide text-zinc-400">Computed</span> : null}
        </div>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-full items-center gap-2 rounded border border-zinc-200 bg-white px-1.5 text-left text-sm hover:border-zinc-300"
          >
            <ColorSwatch color={live} />
            <span className={cn("flex-1 font-mono text-[11px]", inherited && "text-zinc-400")}>
              {live || "None"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[248px] rounded-lg border-zinc-200 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium text-zinc-700">{label}</p>
            {stored ? (
              <button type="button" className="text-[11px] text-zinc-400 hover:text-zinc-700" onClick={() => onChange("")}>
                Reset
              </button>
            ) : null}
          </div>
          <ColorPickerBody color={value || live || "#ffffff"} onChange={onChange} swatches={swatches} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function OpacitySlider({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const numeric = Number.parseFloat(value);
  const current = Number.isFinite(numeric) ? Math.round(numeric * 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <Slider min={0} max={100} step={1} value={[current]} onValueChange={([next]) => onChange(String(next / 100))} />
      <span className="w-10 text-right font-mono text-[11px] text-zinc-500">{current}%</span>
    </div>
  );
}
