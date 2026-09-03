"use client";

import { ColorPickerBody, ColorSwatch } from "@/components/editor/color-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { rgbToHex } from "@/lib/computed-styles";

export type ShadowValue = {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
};

export function parseShadow(value?: string): ShadowValue {
  if (!value || value === "none") {
    return { inset: false, x: 0, y: 4, blur: 16, spread: 0, color: "#000000" };
  }
  const inset = /\binset\b/.test(value);
  const color = value.match(/#(?:[0-9a-f]{3,8})|rgba?\([^)]+\)/i)?.[0] || rgbToHex(value) || "#000000";
  const nums = [...value.matchAll(/-?\d+(?:\.\d+)?px/g)].map((match) => Number.parseFloat(match[0]));
  return {
    inset,
    x: nums[0] ?? 0,
    y: nums[1] ?? 0,
    blur: nums[2] ?? 0,
    spread: nums[3] ?? 0,
    color,
  };
}

export function serializeShadow(shadow: ShadowValue) {
  return `${shadow.inset ? "inset " : ""}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <Input
          className="h-6 w-14 px-1 text-right text-xs"
          value={String(value)}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
        />
      </div>
      <Slider min={min} max={max} step={1} value={[value]} onValueChange={([next]) => onChange(next)} />
    </div>
  );
}

export function ShadowPopover({
  value,
  resolved,
  onChange,
}: {
  value?: string;
  resolved?: string;
  onChange: (value: string) => void;
}) {
  const stored = Boolean(value);
  const parsed = parseShadow(value || resolved);
  const preview = value || resolved || "";

  function update(patch: Partial<ShadowValue>) {
    onChange(serializeShadow({ ...parsed, ...patch }));
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Shadow</p>
        {!stored && preview ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Computed</span>
        ) : null}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-6 items-center gap-1.5 rounded-sm bg-zinc-100 px-1.5 text-left">
            <ColorSwatch color={preview ? parsed.color : ""} />
            <span className="flex-1 truncate text-xs">
              {preview ? `${parsed.inset ? "Inner · " : ""}${parsed.x}, ${parsed.y}, ${parsed.blur}` : "None"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] space-y-3 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Drop shadow</p>
            <button type="button" className="text-[11px] text-muted-foreground" onClick={() => onChange("")}>
              None
            </button>
          </div>
          <div
            className="grid h-14 place-items-center rounded-md border bg-muted/40"
            style={{ boxShadow: serializeShadow(parsed) }}
          >
            <div className="size-8 rounded-md bg-white" />
          </div>
          <NumberRow label="X" value={parsed.x} min={-40} max={40} onChange={(x) => update({ x })} />
          <NumberRow label="Y" value={parsed.y} min={-40} max={40} onChange={(y) => update({ y })} />
          <NumberRow label="Blur" value={parsed.blur} min={0} max={80} onChange={(blur) => update({ blur })} />
          <NumberRow label="Spread" value={parsed.spread} min={-20} max={40} onChange={(spread) => update({ spread })} />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Inner shadow</Label>
            <Switch checked={parsed.inset} onCheckedChange={(inset) => update({ inset })} />
          </div>
          <ColorPickerBody color={parsed.color} onChange={(color) => update({ color })} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
