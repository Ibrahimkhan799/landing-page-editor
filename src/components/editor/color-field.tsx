"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { hexToRgba, parseCssColor, rgbToHex } from "@/lib/computed-styles";
import { cn } from "@/lib/utils";

function normalize(value?: string) {
  if (!value) return "";
  if (value.startsWith("var(")) return "";
  return rgbToHex(value) || "";
}

function readAlpha(value?: string) {
  if (!value) return 1;
  return parseCssColor(value)?.alpha ?? 1;
}

function paintValue(hex: string, alpha: number) {
  if (alpha >= 0.995) return hex;
  return hexToRgba(hex, alpha);
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
        "inline-block size-3.5 shrink-0 rounded-[3px] bg-[length:7px_7px] ring-1 ring-black/10",
        className,
      )}
      style={{
        backgroundColor: preview ? undefined : color || undefined,
        backgroundImage: preview
          ? preview
          : color
            ? undefined
            : "linear-gradient(45deg, #d4d4d8 25%, transparent 25%, transparent 75%, #d4d4d8 75%), linear-gradient(45deg, #d4d4d8 25%, white 25%, white 75%, #d4d4d8 75%)",
        backgroundPosition: color || preview ? undefined : "0 0, 3px 3px",
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
  const parsed = parseCssColor(color);
  const hex = parsed?.hex || normalize(color) || "#ffffff";
  const alpha = parsed && color ? parsed.alpha : readAlpha(color);

  return (
    <div className="grid gap-2">
      <HexColorPicker className="color-picker !w-full" color={hex} onChange={(next) => onChange(paintValue(next, alpha))} />
      <div className="flex items-center gap-1.5">
        <ColorSwatch color={paintValue(hex, alpha)} className="size-5" />
        <HexColorInput
          prefixed
          color={hex}
          onChange={(next) => onChange(paintValue(next, alpha))}
          className="h-6 min-w-0 flex-1 rounded border-0 bg-zinc-100 px-2 font-mono text-[11px] uppercase"
        />
        <span className="w-8 text-right font-mono text-[11px] text-zinc-500">{Math.round(alpha * 100)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 text-[10px] uppercase tracking-wide text-zinc-400">Alpha</span>
        <Slider
          className="h-5"
          min={0}
          max={100}
          step={1}
          value={[Math.round((Number.isFinite(alpha) ? alpha : 1) * 100)]}
          onValueChange={([next]) => onChange(paintValue(hex, (next ?? 0) / 100))}
        />
      </div>
      {swatches?.length ? (
        <div className="flex flex-wrap gap-1">
          {[...new Set(swatches)].map((swatch) => (
            <button
              key={swatch}
              type="button"
              title={swatch}
              className="size-4 rounded-[3px] ring-1 ring-black/10"
              style={{ backgroundColor: swatch }}
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
  const alpha = readAlpha(value || resolved);
  const shown = live ? (alpha < 0.995 ? `${live} ${Math.round(alpha * 100)}%` : live) : "None";

  return (
    <div className={cn("grid gap-1", compact && "gap-0")}>
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
            className="flex h-6 w-full items-center gap-1.5 rounded-sm bg-zinc-100 px-1.5 text-left hover:bg-zinc-200/70"
          >
            <ColorSwatch color={value || live} />
            <span className={cn("flex-1 font-mono text-[11px]", inherited && "text-zinc-400")}>{shown}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] rounded-lg border-zinc-200 p-3 shadow-xl">
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
      <span className="w-8 text-right font-mono text-[11px] text-zinc-500">{current}%</span>
    </div>
  );
}
