"use client";

import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

function parsePx(value?: string) {
  if (!value) return 0;
  return Number.parseFloat(value) || 0;
}

export function BlurPopover({
  layer,
  backdrop,
  resolvedLayer,
  resolvedBackdrop,
  onChange,
}: {
  layer?: string;
  backdrop?: string;
  resolvedLayer?: string;
  resolvedBackdrop?: string;
  onChange: (patch: { filterBlur?: string; backdropBlur?: string }) => void;
}) {
  const layerValue = parsePx(layer || resolvedLayer);
  const backdropValue = parsePx(backdrop || resolvedBackdrop);

  return (
    <div className="grid gap-1.5">
      <p className="text-xs text-muted-foreground">Blur</p>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-6 w-full items-center justify-between rounded-sm bg-zinc-100 px-1.5 text-[11px]">
            <span>Layer {layerValue} · Backdrop {backdropValue}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] space-y-3 p-3">
          <p className="text-xs font-medium">Blur</p>
          <div className="grid gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Layer blur</Label>
              <span className="font-mono text-[11px]">{layerValue}px</span>
            </div>
            <Slider
              min={0}
              max={40}
              step={1}
              value={[layerValue]}
              onValueChange={([next]) => onChange({ filterBlur: next ? `${next}px` : "" })}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Background blur</Label>
              <span className="font-mono text-[11px]">{backdropValue}px</span>
            </div>
            <Slider
              min={0}
              max={40}
              step={1}
              value={[backdropValue]}
              onValueChange={([next]) => onChange({ backdropBlur: next ? `${next}px` : "" })}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
