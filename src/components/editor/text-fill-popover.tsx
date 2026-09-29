"use client";

import { useState } from "react";
import { ColorPickerBody, ColorSwatch } from "@/components/editor/color-field";
import { SegmentedControl } from "@/components/editor/compact-controls";
import { GradientField } from "@/components/editor/gradient-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { StyleProps } from "@/lib/types";

type TextFillMode = "solid" | "gradient";

const defaultGradient = "linear-gradient(135deg, #0f766e, #f59e0b)";

export function TextFillPopover({
  styles,
  computed,
  onChange,
  swatches,
}: {
  styles: StyleProps;
  computed: StyleProps;
  onChange: (patch: Partial<StyleProps>) => void;
  swatches?: string[];
}) {
  const resolvedGradient = styles.textGradient || computed.textGradient || "";
  const color = styles.color || computed.color || "#18181b";
  const [selectedMode, setSelectedMode] = useState<TextFillMode | null>(null);
  const mode = selectedMode ?? (resolvedGradient ? "gradient" : "solid");
  const inherited = styles.color === undefined && styles.textGradient === undefined;

  function selectMode(next: TextFillMode) {
    setSelectedMode(next);
    if (next === "solid") {
      onChange({ textGradient: "" });
      return;
    }
    if (!resolvedGradient) onChange({ textGradient: defaultGradient });
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">Text fill</p>
        {inherited ? <span className="text-[10px] uppercase tracking-wide text-zinc-400">Computed</span> : null}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-6 items-center gap-1.5 rounded-sm bg-zinc-100 px-1.5 text-left hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <ColorSwatch
              color={mode === "solid" ? color : ""}
              preview={mode === "gradient" ? resolvedGradient || defaultGradient : undefined}
              className="size-4 rounded-[3px]"
            />
            <span className="flex-1 truncate font-mono text-[11px] text-zinc-700 dark:text-zinc-200">
              {mode === "gradient" ? "Gradient" : color || "Inherited"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="editor-popover w-[248px] rounded-lg border-zinc-200 p-2.5 shadow-xl">
          <div className="grid gap-2.5">
            <SegmentedControl
              label="Text fill type"
              value={mode}
              options={[
                { value: "solid", label: "Solid" },
                { value: "gradient", label: "Gradient" },
              ]}
              onChange={selectMode}
            />
            {mode === "solid" ? (
              <ColorPickerBody color={color} onChange={(next) => onChange({ color: next, textGradient: "" })} swatches={swatches} />
            ) : (
              <GradientField
                value={resolvedGradient || defaultGradient}
                onChange={(textGradient) => {
                  onChange({ textGradient });
                  if (!textGradient) setSelectedMode("solid");
                }}
                swatches={swatches}
              />
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
