"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const color = value || "#0f766e";
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-2 text-left text-sm"
          >
            <span className="h-6 w-6 rounded border" style={{ background: color }} />
            <span className="font-mono text-xs">{color}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px]">
          <HexColorPicker color={color} onChange={onChange} />
          <HexColorInput
            prefixed
            color={color}
            onChange={onChange}
            className="mt-3 h-8 w-full rounded-md border px-2 text-sm"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
