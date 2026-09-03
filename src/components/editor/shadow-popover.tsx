"use client";

import { ColorPickerBody, ColorSwatch } from "@/components/editor/color-field";
import { SliderRow } from "@/components/editor/compact-controls";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">Shadow</p>
        {!stored && preview ? (
          <span className="text-[10px] uppercase tracking-wide text-zinc-400">Computed</span>
        ) : null}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-6 items-center gap-1.5 rounded-sm bg-zinc-100 px-1.5 text-left">
            <ColorSwatch color={preview ? parsed.color : ""} />
            <span className="flex-1 truncate text-[11px]">
              {preview ? `${parsed.inset ? "Inner · " : ""}${parsed.x}, ${parsed.y}, ${parsed.blur}` : "None"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="editor-popover w-[248px] space-y-2 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium">Drop shadow</p>
            <button type="button" className="text-[11px] text-zinc-400" onClick={() => onChange("")}>
              None
            </button>
          </div>
          <div
            className="grid h-10 place-items-center rounded-sm bg-zinc-100"
            style={{ boxShadow: serializeShadow(parsed) }}
          >
            <div className="size-6 rounded-sm bg-white" />
          </div>
          <SliderRow label="X" value={parsed.x} min={-40} max={40} onChange={(x) => update({ x })} />
          <SliderRow label="Y" value={parsed.y} min={-40} max={40} onChange={(y) => update({ y })} />
          <SliderRow label="Blur" value={parsed.blur} min={0} max={80} onChange={(blur) => update({ blur })} />
          <SliderRow label="Spread" value={parsed.spread} min={-20} max={40} onChange={(spread) => update({ spread })} />
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-zinc-500">Inner</Label>
            <Switch checked={parsed.inset} onCheckedChange={(inset) => update({ inset })} />
          </div>
          <ColorPickerBody color={parsed.color} onChange={(color) => update({ color })} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
