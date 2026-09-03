"use client";

import { useMemo, useState } from "react";
import { ColorPickerBody, ColorSwatch } from "@/components/editor/color-field";
import { GradientField } from "@/components/editor/gradient-field";
import { MediaPicker } from "@/components/editor/media-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { rgbToHex } from "@/lib/computed-styles";
import type { StyleProps } from "@/lib/types";
import { cn } from "@/lib/utils";

type FillMode = "solid" | "gradient" | "image";

function detectMode(styles: StyleProps, computed: StyleProps): FillMode {
  const image = styles.backgroundImage || computed.backgroundImage || "";
  if (image.includes("gradient")) return "gradient";
  if (image.includes("url(")) return "image";
  return "solid";
}

function fillLabel(mode: FillMode, hex: string) {
  if (mode === "gradient") return "Gradient";
  if (mode === "image") return "Image";
  return hex || "None";
}

const modes: { id: FillMode; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
  { id: "image", label: "Image" },
];

export function FillPopover({
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
  const stored = styles.background || "";
  const hex = rgbToHex(stored || computed.background || "") || stored;
  const inherited = !styles.background && !styles.backgroundImage;
  const detected = detectMode(styles, computed);
  const [mode, setMode] = useState<FillMode | null>(null);
  const currentMode = mode ?? detected;
  const imageSrc = useMemo(() => {
    const value = styles.backgroundImage || "";
    const match = value.match(/url\(["']?(.+?)["']?\)/);
    return match?.[1] ?? "";
  }, [styles.backgroundImage]);

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">Fill</p>
        {inherited ? <span className="text-[10px] uppercase tracking-wide text-zinc-400">Computed</span> : null}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-7 items-center gap-2 rounded border border-zinc-200 bg-white px-1.5 text-left hover:border-zinc-300"
          >
            <ColorSwatch
              color={detected === "solid" ? hex : ""}
              className="size-4 rounded-[3px]"
              preview={
                detected === "gradient"
                  ? styles.backgroundImage || computed.backgroundImage
                  : detected === "image"
                    ? styles.backgroundImage || computed.backgroundImage
                    : undefined
              }
            />
            <span className="flex-1 truncate font-mono text-[11px] text-zinc-700">
              {fillLabel(detected, hex)}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[248px] rounded-lg border-zinc-200 p-0 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
            <p className="text-[11px] font-medium text-zinc-700">Fill</p>
            <button
              type="button"
              className="text-[11px] text-zinc-400 hover:text-zinc-700"
              onClick={() => onChange({ background: "", backgroundImage: "" })}
            >
              None
            </button>
          </div>
          <div className="grid grid-cols-3 gap-0.5 border-b border-zinc-100 p-1.5">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={cn(
                  "h-7 rounded text-[11px] font-medium",
                  currentMode === item.id ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            {currentMode === "solid" ? (
              <ColorPickerBody
                color={hex || "#ffffff"}
                onChange={(background) => onChange({ background, backgroundImage: "" })}
                swatches={swatches}
              />
            ) : null}
            {currentMode === "gradient" ? (
              <GradientField
                value={
                  styles.backgroundImage?.includes("gradient")
                    ? styles.backgroundImage
                    : "linear-gradient(135deg, #0f766e, #f59e0b)"
                }
                onChange={(backgroundImage) => onChange({ backgroundImage, background: "" })}
              />
            ) : null}
            {currentMode === "image" ? (
              <MediaPicker
                label="Image fill"
                value={imageSrc}
                onChange={(src) => onChange({ backgroundImage: src ? `url("${src}")` : "", background: "" })}
              />
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
