"use client";

import { SliderRow } from "@/components/editor/compact-controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
    <div className="grid gap-1">
      <p className="text-[11px] text-zinc-500">Blur</p>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-6 w-full items-center justify-between rounded-sm bg-zinc-100 px-1.5 text-[11px]">
            <span>Layer {layerValue} · Backdrop {backdropValue}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="editor-popover w-[248px] space-y-2 p-2.5">
          <p className="text-[11px] font-medium">Blur</p>
          <SliderRow
            label="Layer"
            value={layerValue}
            min={0}
            max={40}
            suffix="px"
            onChange={(next) => onChange({ filterBlur: next ? `${next}px` : "" })}
          />
          <SliderRow
            label="Back"
            value={backdropValue}
            min={0}
            max={40}
            suffix="px"
            onChange={(next) => onChange({ backdropBlur: next ? `${next}px` : "" })}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
