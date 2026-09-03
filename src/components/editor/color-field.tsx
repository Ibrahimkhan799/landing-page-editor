"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { rgbToHex } from "@/lib/computed-styles";
import { cn } from "@/lib/utils";

function normalize(value?: string) {
  if (!value) return "";
  if (value.startsWith("#") || value.startsWith("rgb")) return rgbToHex(value) || value;
  if (value.startsWith("var(")) return "";
  return rgbToHex(value) || "";
}

export function ColorSwatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-4 shrink-0 rounded-sm border", className)}
      style={{
        background:
          color ||
          "linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%), linear-gradient(45deg, #e2e8f0 25%, white 25%, white 75%, #e2e8f0 75%)",
        backgroundSize: color ? undefined : "8px 8px",
        backgroundPosition: color ? undefined : "0 0, 4px 4px",
      }}
    />
  );
}

export function ColorPickerBody({
  color,
  onChange,
}: {
  color: string;
  onChange: (value: string) => void;
}) {
  const hex = normalize(color) || "#ffffff";
  return (
    <div className="grid gap-2">
      <HexColorPicker className="color-picker" color={hex} onChange={onChange} />
      <HexColorInput
        prefixed
        color={hex}
        onChange={onChange}
        className="h-8 w-full rounded-md border px-2 font-mono text-xs"
      />
    </div>
  );
}

export function ColorField({
  label,
  value,
  resolved,
  onChange,
  compact,
}: {
  label: string;
  value?: string;
  resolved?: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const stored = normalize(value);
  const live = stored || normalize(resolved);
  const inherited = !stored && Boolean(live);

  return (
    <div className={cn("grid gap-1.5", compact && "gap-0")}>
      {compact ? null : (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          {inherited ? <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Computed</span> : null}
        </div>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center gap-2 rounded-md border bg-background px-2 text-left text-sm"
          >
            <ColorSwatch color={live} />
            <span className={cn("flex-1 font-mono text-xs", inherited && "text-muted-foreground")}>
              {live || "None"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[200px] p-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium">{label}</p>
            {stored ? (
              <button type="button" className="text-[11px] text-muted-foreground" onClick={() => onChange("")}>
                Reset
              </button>
            ) : null}
          </div>
          <ColorPickerBody color={live || "#ffffff"} onChange={onChange} />
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
      <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">{current}%</span>
    </div>
  );
}
