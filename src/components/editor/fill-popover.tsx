"use client";

import { ColorPickerBody, ColorSwatch } from "@/components/editor/color-field";
import { GradientField } from "@/components/editor/gradient-field";
import { MediaPicker } from "@/components/editor/media-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { rgbToHex } from "@/lib/computed-styles";
import type { StyleProps } from "@/lib/types";

function fillKind(styles: StyleProps, computed: StyleProps) {
  if (styles.backgroundImage || computed.backgroundImage) {
    return styles.backgroundImage || computed.backgroundImage || "";
  }
  return "";
}

export function FillPopover({
  styles,
  computed,
  onChange,
}: {
  styles: StyleProps;
  computed: StyleProps;
  onChange: (patch: Partial<StyleProps>) => void;
}) {
  const stored = styles.background || "";
  const hex = rgbToHex(stored || computed.background || "") || stored;
  const inherited = !styles.background && !styles.backgroundImage;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Fill</p>
        {inherited ? <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Computed</span> : null}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-left">
            <ColorSwatch color={hex} className="size-4" />
            <span className="flex-1 truncate font-mono text-xs">
              {fillKind(styles, computed) ? "Image / gradient" : hex || "None"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[240px] space-y-3 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Fill</p>
            <button
              type="button"
              className="text-[11px] text-muted-foreground"
              onClick={() => onChange({ background: "", backgroundImage: "" })}
            >
              None
            </button>
          </div>
          <ColorPickerBody color={hex || "#ffffff"} onChange={(background) => onChange({ background, backgroundImage: styles.backgroundImage })} />
          <GradientField
            label="Gradient"
            value={styles.backgroundImage?.includes("gradient") ? styles.backgroundImage : ""}
            onChange={(backgroundImage) => onChange({ backgroundImage })}
          />
          <MediaPicker
            label="Image"
            value={styles.backgroundImage?.includes("url(") ? styles.backgroundImage.slice(5, -2) : ""}
            onChange={(src) => onChange({ backgroundImage: src ? `url("${src}")` : "" })}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
