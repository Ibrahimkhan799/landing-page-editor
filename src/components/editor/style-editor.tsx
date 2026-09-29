"use client";

import { useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronRight,
  Italic,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
  Strikethrough,
  Underline,
  WrapText,
} from "lucide-react";
import { BlurPopover } from "@/components/editor/blur-popover";
import { ColorField, OpacitySlider } from "@/components/editor/color-field";
import { DimensionInput, LengthInput, SegmentedControl } from "@/components/editor/compact-controls";
import { FillPopover } from "@/components/editor/fill-popover";
import { ShadowPopover } from "@/components/editor/shadow-popover";
import { MarginField, PaddingField } from "@/components/editor/spacing-field";
import { TextFillPopover } from "@/components/editor/text-fill-popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayed } from "@/lib/computed-styles";
import { FONT_OPTIONS } from "@/lib/defaults";
import type { NodeMeta, StyleProps } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <Label className="text-[11px] text-zinc-500">{label}</Label>
      {children}
    </div>
  );
}

function LengthField({
  label,
  value,
  onChange,
  placeholder,
  allowAuto = false,
  defaultUnit = "px",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowAuto?: boolean;
  defaultUnit?: string;
}) {
  return (
    <Field label={label}>
      <LengthInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        allowAuto={allowAuto}
        defaultUnit={defaultUnit}
        ariaLabel={label}
      />
    </Field>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const current = value || options[0];
  return (
    <Field label={label}>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="h-6 text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function repeatedTrackCount(value: string, fallback = 1) {
  const repeat = value.match(/^repeat\(\s*(\d+)\s*,/i);
  if (repeat) return Math.max(1, Math.min(12, Number(repeat[1])));
  const tracks = value.trim().match(/(?:minmax\([^)]*\)|[^\s]+)/g);
  return tracks?.length ? Math.max(1, Math.min(12, tracks.length)) : fallback;
}

function GridTrackStepper({
  label,
  count,
  onChange,
}: {
  label: string;
  count: number;
  onChange: (count: number) => void;
}) {
  return (
    <div className="grid gap-0.5">
      <Label className="text-[11px] text-zinc-500">{label}</Label>
      <div className="flex h-6 items-center gap-1 rounded-[4px] bg-zinc-100 p-0.5 dark:bg-zinc-800">
        <button
          type="button"
          aria-label={`Remove ${label.toLowerCase()}`}
          disabled={count <= 1}
          onClick={() => onChange(Math.max(1, count - 1))}
          className="grid size-5 place-items-center rounded text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        >
          <Minus className="size-3" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5" aria-label={`${count} ${label.toLowerCase()}`}>
          {Array.from({ length: Math.min(count, 8) }, (_, index) => (
            <span key={index} className="h-3 min-w-1 flex-1 rounded-[2px] border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-700" />
          ))}
          {count > 8 ? <span className="text-[9px] text-zinc-500">+{count - 8}</span> : null}
        </div>
        <span className="w-5 text-center font-mono text-[9px] text-zinc-500 dark:text-zinc-300">{count}</span>
        <button
          type="button"
          aria-label={`Add ${label.toLowerCase()}`}
          disabled={count >= 12}
          onClick={() => onChange(Math.min(12, count + 1))}
          className="grid size-5 place-items-center rounded text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-100 pb-2 last:border-0 last:pb-0 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        {title}
        {open ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
      </button>
      {open ? <div className="space-y-2 pt-1">{children}</div> : null}
    </div>
  );
}

export function IdentityFields({
  className,
  htmlId,
  onClassName,
  onHtmlId,
}: {
  className?: string;
  htmlId?: string;
  onClassName: (value: string) => void;
  onHtmlId: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="ID">
        <Input value={htmlId ?? ""} onChange={(event) => onHtmlId(event.target.value)} placeholder="hero-cta" />
      </Field>
      <Field label="CSS classes">
        <Input
          value={className ?? ""}
          onChange={(event) => onClassName(event.target.value)}
          placeholder="mt-4 tracking-tight"
        />
      </Field>
    </div>
  );
}

export function StyleEditor({
  styles,
  computed,
  onChange,
  swatches,
  elementType,
}: {
  styles?: StyleProps;
  computed?: StyleProps;
  onChange: (styles: StyleProps) => void;
  swatches?: string[];
  elementType?: string;
}) {
  const current = styles ?? {};
  const live = computed ?? {};
  function patch(next: Partial<StyleProps>) {
    onChange({ ...current, ...next });
  }
  function show(key: keyof StyleProps) {
    return displayed(current, live, key);
  }
  const fontValue = current.fontFamily || "__inherit__";
  const displayValue = show("display") || "block";
  const displayMode =
    displayValue === "flex" || displayValue === "inline-flex"
      ? "flex"
      : displayValue === "grid"
        ? "grid"
        : displayValue === "none"
          ? "none"
          : "block";
  const directionMode = show("flexDirection").startsWith("column") ? "column" : "row";
  const justifyValue = show("justifyContent");
  const justifyMode =
    justifyValue === "center" || justifyValue === "flex-end" || justifyValue === "space-between"
      ? justifyValue
      : "flex-start";
  const alignValue = show("alignItems");
  const alignMode =
    alignValue === "center" || alignValue === "flex-end" || alignValue === "stretch" ? alignValue : "flex-start";
  const positionValue = show("position") || "static";
  const gridColumns = current.gridTemplateColumns || live.gridTemplateColumns || "repeat(2, minmax(0, 1fr))";
  const gridRows = current.gridTemplateRows || live.gridTemplateRows || "auto";
  const gridColumnMode = gridColumns.includes("auto-fit")
    ? "fit"
    : /^repeat\(\s*\d+\s*,\s*minmax\(0,\s*1fr\)\s*\)$/i.test(gridColumns)
      ? "equal"
      : "custom";
  const gridRowMode = !gridRows || gridRows === "auto"
    ? "auto"
    : /^repeat\(\s*\d+\s*,\s*minmax\(0,\s*1fr\)\s*\)$/i.test(gridRows)
      ? "equal"
      : "custom";
  const gridColumnCount = repeatedTrackCount(gridColumns, 2);
  const gridRowCount = repeatedTrackCount(gridRows, 1);
  const gridMinWidth = gridColumns.match(/minmax\(\s*([^,]+),\s*1fr\s*\)/i)?.[1] || "220px";

  const isText = elementType === "heading" || elementType === "paragraph";
  const isContainer =
    elementType === "frame" || elementType === "slot" || elementType === "list" || elementType === "conditional";
  const isMedia = elementType === "image" || elementType === "video";
  const isInteractive = elementType === "button" || elementType === "badge";

  // ── Section content blocks ──────────────────────────────────────────────

  const fillSection = (
    <CollapsibleSection title="Fill & stroke" defaultOpen>
      <FillPopover styles={current} computed={live} onChange={patch} swatches={swatches} />
      {!isText ? (
        <ColorField
          label="Text"
          value={current.color}
          resolved={live.color}
          onChange={(color) => patch({ color })}
          swatches={swatches}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Stroke">
          <Input
            value={current.borderWidth || live.borderWidth || ""}
            onChange={(event) => patch({ borderWidth: event.target.value })}
          />
        </Field>
        <SelectField
          label="Style"
          value={show("borderStyle") || "none"}
          options={["none", "solid", "dashed", "dotted"]}
          onChange={(borderStyle) => patch({ borderStyle })}
        />
      </div>
      <ColorField
        label="Stroke color"
        value={current.borderColor}
        resolved={live.borderColor}
        onChange={(borderColor) => patch({ borderColor })}
        swatches={swatches}
      />
      <Field label="Radius">
        <Input
          value={current.borderRadius || live.borderRadius || ""}
          onChange={(event) => patch({ borderRadius: event.target.value })}
        />
      </Field>
    </CollapsibleSection>
  );

  const backgroundSection = (
    <CollapsibleSection title="Background" defaultOpen={false}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="BG size">
          <Input
            value={current.backgroundSize || live.backgroundSize || ""}
            placeholder="cover"
            onChange={(event) => patch({ backgroundSize: event.target.value })}
          />
        </Field>
        <SelectField
          label="BG repeat"
          value={show("backgroundRepeat") || "no-repeat"}
          options={["no-repeat", "repeat", "repeat-x", "repeat-y"]}
          onChange={(backgroundRepeat) =>
            patch({ backgroundRepeat: backgroundRepeat === "no-repeat" ? "" : backgroundRepeat })
          }
        />
      </div>
      <Field label="BG position">
        <Input
          value={current.backgroundPosition || live.backgroundPosition || ""}
          placeholder="center"
          onChange={(event) => patch({ backgroundPosition: event.target.value })}
        />
      </Field>
    </CollapsibleSection>
  );

  const effectsSection = (
    <CollapsibleSection title="Effects" defaultOpen={false}>
      <ShadowPopover value={current.boxShadow} resolved={live.boxShadow} onChange={(boxShadow) => patch({ boxShadow })} />
      <BlurPopover
        layer={current.filterBlur}
        backdrop={current.backdropBlur}
        resolvedLayer={live.filterBlur}
        resolvedBackdrop={live.backdropBlur}
        onChange={patch}
      />
      <div className="grid gap-1">
        <Label className="text-[11px] text-zinc-500">Opacity</Label>
        <OpacitySlider value={show("opacity") || "1"} onChange={(opacity) => patch({ opacity })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Aspect ratio">
          <Input
            value={current.aspectRatio || ""}
            placeholder="16 / 9"
            onChange={(event) => patch({ aspectRatio: event.target.value })}
          />
        </Field>
        <SelectField
          label="Object fit"
          value={show("objectFit") || ""}
          options={["", "cover", "contain", "fill", "none", "scale-down"]}
          onChange={(objectFit) => patch({ objectFit })}
        />
      </div>
      <Field label="Object pos">
        <Input
          value={current.objectPosition || live.objectPosition || ""}
          placeholder="center"
          onChange={(event) => patch({ objectPosition: event.target.value })}
        />
      </Field>
    </CollapsibleSection>
  );

  const typographySection = (
    <CollapsibleSection title="Typography" defaultOpen={isText || isInteractive}>
      <Field label="Font">
        <Select
          value={fontValue}
          onValueChange={(fontFamily) => patch({ fontFamily: fontFamily === "__inherit__" ? "" : fontFamily })}
        >
          <SelectTrigger className="h-6 text-[11px]">
            <SelectValue placeholder="Inherit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__inherit__">Inherit</SelectItem>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {isText ? <TextFillPopover styles={current} computed={live} onChange={patch} swatches={swatches} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <LengthField
          label="Size"
          value={current.fontSize || live.fontSize || ""}
          onChange={(fontSize) => patch({ fontSize })}
        />
        <SelectField
          label="Weight"
          value={show("fontWeight") || "400"}
          options={["300", "400", "500", "600", "700", "800"]}
          onChange={(fontWeight) => patch({ fontWeight })}
        />
        <LengthField
          label="Line height"
          value={current.lineHeight || live.lineHeight || ""}
          onChange={(lineHeight) => patch({ lineHeight })}
        />
        <LengthField
          label="Letter spacing"
          value={current.letterSpacing || live.letterSpacing || ""}
          placeholder="0"
          onChange={(letterSpacing) => patch({ letterSpacing })}
        />
      </div>
      <Field label="Alignment">
        <SegmentedControl
          label="Text alignment"
          value={show("textAlign") || "left"}
          options={[
            { value: "left", label: "Align left", icon: <AlignLeft className="size-3" /> },
            { value: "center", label: "Align center", icon: <AlignCenter className="size-3" /> },
            { value: "right", label: "Align right", icon: <AlignRight className="size-3" /> },
            { value: "justify", label: "Justify", icon: <AlignJustify className="size-3" /> },
          ]}
          onChange={(textAlign) => patch({ textAlign })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Style">
          <SegmentedControl
            label="Font style"
            value={show("fontStyle") || "normal"}
            options={[
              { value: "normal", label: "Normal", icon: <span className="text-[10px] font-medium">N</span> },
              { value: "italic", label: "Italic", icon: <Italic className="size-3" /> },
            ]}
            onChange={(fontStyle) => patch({ fontStyle })}
          />
        </Field>
        <Field label="Decoration">
          <SegmentedControl
            label="Text decoration"
            value={show("textDecoration") || "none"}
            options={[
              { value: "none", label: "None", icon: <span className="text-[10px]">—</span> },
              { value: "underline", label: "Underline", icon: <Underline className="size-3" /> },
              { value: "line-through", label: "Strike through", icon: <Strikethrough className="size-3" /> },
            ]}
            onChange={(textDecoration) => patch({ textDecoration })}
          />
        </Field>
      </div>
      <SelectField
        label="Transform"
        value={show("textTransform") || "none"}
        options={["none", "uppercase", "lowercase", "capitalize"]}
        onChange={(textTransform) => patch({ textTransform })}
      />
    </CollapsibleSection>
  );

  const positionSection = (
    <CollapsibleSection title="Position & size" defaultOpen={!isContainer}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width">
          <DimensionInput
            value={current.width || live.width || ""}
            ariaLabel="Width"
            onChange={(width) => patch({ width })}
          />
        </Field>
        <Field label="Height">
          <DimensionInput
            value={current.height || live.height || ""}
            ariaLabel="Height"
            onChange={(height) => patch({ height })}
          />
        </Field>
        <LengthField
          label="Min width"
          value={current.minWidth || live.minWidth || ""}
          onChange={(minWidth) => patch({ minWidth })}
        />
        <LengthField
          label="Min height"
          value={current.minHeight || live.minHeight || ""}
          onChange={(minHeight) => patch({ minHeight })}
        />
        <LengthField
          label="Max width"
          value={current.maxWidth || live.maxWidth || ""}
          onChange={(maxWidth) => patch({ maxWidth })}
        />
        <LengthField
          label="Max height"
          value={current.maxHeight || live.maxHeight || ""}
          onChange={(maxHeight) => patch({ maxHeight })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Position"
          value={positionValue}
          options={["static", "relative", "absolute", "sticky", "fixed"]}
          onChange={(position) => patch({ position })}
        />
        <Field label="Z">
          <Input
            value={current.zIndex || live.zIndex || ""}
            placeholder="auto"
            onChange={(event) => patch({ zIndex: event.target.value })}
          />
        </Field>
      </div>
      {positionValue !== "static" ? (
        <div className="grid grid-cols-2 gap-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
          <LengthField
            label="Top"
            value={current.top || live.top || ""}
            placeholder="auto"
            allowAuto
            onChange={(top) => patch({ top })}
          />
          <LengthField
            label="Right"
            value={current.right || live.right || ""}
            placeholder="auto"
            allowAuto
            onChange={(right) => patch({ right })}
          />
          <LengthField
            label="Bottom"
            value={current.bottom || live.bottom || ""}
            placeholder="auto"
            allowAuto
            onChange={(bottom) => patch({ bottom })}
          />
          <LengthField
            label="Left"
            value={current.left || live.left || ""}
            placeholder="auto"
            allowAuto
            onChange={(left) => patch({ left })}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Grid col">
          <Input
            value={current.gridColumn || ""}
            placeholder="auto"
            onChange={(event) => patch({ gridColumn: event.target.value })}
          />
        </Field>
        <Field label="Grid row">
          <Input
            value={current.gridRow || ""}
            placeholder="auto"
            onChange={(event) => patch({ gridRow: event.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LengthField
          label="Translate X"
          value={current.translateX ?? ""}
          placeholder="0"
          onChange={(translateX) => patch({ translateX })}
        />
        <LengthField
          label="Translate Y"
          value={current.translateY ?? ""}
          placeholder="0"
          onChange={(translateY) => patch({ translateY })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Rotate">
          <Input
            value={current.rotate ?? ""}
            placeholder="0deg"
            onChange={(event) => patch({ rotate: event.target.value })}
          />
        </Field>
        <Field label="Scale">
          <Input
            value={current.scale ?? ""}
            placeholder="1"
            onChange={(event) => patch({ scale: event.target.value })}
          />
        </Field>
      </div>
    </CollapsibleSection>
  );

  const layoutSection = (
    <CollapsibleSection title="Auto layout" defaultOpen={isContainer}>
      <Field label="Layout mode">
        <SegmentedControl
          label="Layout mode"
          value={displayMode}
          options={[
            { value: "block", label: "Free" },
            { value: "flex", label: "Auto" },
            { value: "grid", label: "Grid" },
            { value: "none", label: "Hide" },
          ]}
          onChange={(display) => patch({ display })}
        />
      </Field>
      {displayMode === "flex" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Direction">
              <SegmentedControl
                label="Auto layout direction"
                value={directionMode}
                options={[
                  { value: "row", label: "Horizontal", icon: <MoveHorizontal className="size-3" /> },
                  { value: "column", label: "Vertical", icon: <MoveVertical className="size-3" /> },
                ]}
                onChange={(flexDirection) => patch({ display: "flex", flexDirection })}
              />
            </Field>
            <Field label="Wrap">
              <SegmentedControl
                label="Auto layout wrapping"
                value={show("flexWrap") === "wrap" || show("flexWrap") === "wrap-reverse" ? "wrap" : "nowrap"}
                options={[
                  { value: "nowrap", label: "No wrap", icon: <span className="text-[10px]">—</span> },
                  { value: "wrap", label: "Wrap", icon: <WrapText className="size-3" /> },
                ]}
                onChange={(flexWrap) => patch({ flexWrap: flexWrap === "nowrap" ? "" : flexWrap })}
              />
            </Field>
          </div>
          <Field label="Primary axis">
            <SegmentedControl
              label="Primary axis alignment"
              value={justifyMode}
              options={[
                { value: "flex-start", label: "Start", icon: <AlignLeft className="size-3" /> },
                { value: "center", label: "Center", icon: <AlignCenter className="size-3" /> },
                { value: "flex-end", label: "End", icon: <AlignRight className="size-3" /> },
                { value: "space-between", label: "Space between", icon: <MoveHorizontal className="size-3" /> },
              ]}
              onChange={(justifyContent) => patch({ justifyContent })}
            />
          </Field>
          <Field label="Cross axis">
            <SegmentedControl
              label="Cross axis alignment"
              value={alignMode}
              options={[
                { value: "flex-start", label: "Start", icon: <AlignLeft className="size-3" /> },
                { value: "center", label: "Center", icon: <AlignCenter className="size-3" /> },
                { value: "flex-end", label: "End", icon: <AlignRight className="size-3" /> },
                { value: "stretch", label: "Stretch", icon: <MoveHorizontal className="size-3" /> },
              ]}
              onChange={(alignItems) => patch({ alignItems })}
            />
          </Field>
          <LengthField
            label="Item spacing"
            value={current.gap || live.gap || ""}
            onChange={(gap) => patch({ gap })}
          />
        </>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Align self"
          value={show("alignSelf") || "auto"}
          options={["auto", "flex-start", "center", "flex-end", "stretch", "baseline"]}
          onChange={(alignSelf) => patch({ alignSelf: alignSelf === "auto" ? "" : alignSelf })}
        />
        <SelectField
          label="Overflow"
          value={show("overflow") || "visible"}
          options={["visible", "hidden", "auto", "scroll", "clip"]}
          onChange={(overflow) => patch({ overflow })}
        />
      </div>
      {displayMode === "flex" ? (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Grow">
            <Input
              value={current.flexGrow || ""}
              placeholder="0"
              inputMode="decimal"
              onChange={(event) => patch({ flexGrow: event.target.value })}
            />
          </Field>
          <Field label="Shrink">
            <Input
              value={current.flexShrink || ""}
              placeholder="1"
              inputMode="decimal"
              onChange={(event) => patch({ flexShrink: event.target.value })}
            />
          </Field>
          <LengthField
            label="Basis"
            value={current.flexBasis || ""}
            placeholder="auto"
            allowAuto
            onChange={(flexBasis) => patch({ flexBasis })}
          />
        </div>
      ) : null}
      {displayMode === "grid" ? (
        <div className="space-y-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
          <Field label="Columns">
            <SegmentedControl
              label="Grid column behavior"
              value={gridColumnMode}
              options={[
                { value: "equal", label: "Equal" },
                { value: "fit", label: "Auto fit" },
                { value: "custom", label: "Custom" },
              ]}
              onChange={(mode) => {
                if (mode === "equal") patch({ gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))` });
                else if (mode === "fit") patch({ gridTemplateColumns: `repeat(auto-fit, minmax(${gridMinWidth}, 1fr))` });
                else patch({ gridTemplateColumns: "1fr 1fr" });
              }}
            />
          </Field>
          {gridColumnMode === "equal" ? (
            <GridTrackStepper
              label="Column count"
              count={gridColumnCount}
              onChange={(count) => patch({ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` })}
            />
          ) : gridColumnMode === "fit" ? (
            <LengthField
              label="Minimum column width"
              value={gridMinWidth}
              onChange={(minimum) => patch({ gridTemplateColumns: `repeat(auto-fit, minmax(${minimum || "220px"}, 1fr))` })}
            />
          ) : (
            <Field label="Column template">
              <Input
                value={current.gridTemplateColumns || gridColumns}
                placeholder="1fr 2fr"
                onChange={(event) => patch({ gridTemplateColumns: event.target.value })}
              />
            </Field>
          )}
          <Field label="Rows">
            <SegmentedControl
              label="Grid row behavior"
              value={gridRowMode}
              options={[
                { value: "auto", label: "Auto" },
                { value: "equal", label: "Equal" },
                { value: "custom", label: "Custom" },
              ]}
              onChange={(mode) => {
                if (mode === "auto") patch({ gridTemplateRows: "auto" });
                else if (mode === "equal") patch({ gridTemplateRows: `repeat(${gridRowCount}, minmax(0, 1fr))` });
                else patch({ gridTemplateRows: "auto 1fr" });
              }}
            />
          </Field>
          {gridRowMode === "equal" ? (
            <GridTrackStepper
              label="Row count"
              count={gridRowCount}
              onChange={(count) => patch({ gridTemplateRows: `repeat(${count}, minmax(0, 1fr))` })}
            />
          ) : gridRowMode === "custom" ? (
            <Field label="Row template">
              <Input
                value={current.gridTemplateRows || gridRows}
                placeholder="auto 1fr"
                onChange={(event) => patch({ gridTemplateRows: event.target.value })}
              />
            </Field>
          ) : null}
          <LengthField
            label="Grid gap"
            value={current.gap || live.gap || ""}
            onChange={(gap) => patch({ gap })}
          />
        </div>
      ) : null}
      <PaddingField value={current.padding ?? live.padding} onChange={(padding) => patch({ padding })} />
      <MarginField value={current.margin ?? live.margin} onChange={(margin) => patch({ margin })} />
    </CollapsibleSection>
  );

  // ── Ordered rendering based on element type ────────────────────────────

  if (isText) {
    // Text: typography front and centre
    return (
      <div>
        {typographySection}
        {fillSection}
        {effectsSection}
        {positionSection}
        {backgroundSection}
        {layoutSection}
      </div>
    );
  }

  if (isContainer) {
    // Containers: layout is the primary concern
    return (
      <div>
        {layoutSection}
        {positionSection}
        {fillSection}
        {backgroundSection}
        {effectsSection}
        {typographySection}
      </div>
    );
  }

  if (isMedia) {
    // Images / videos: fill + effects (object-fit lives here) are primary
    return (
      <div>
        {fillSection}
        {effectsSection}
        {backgroundSection}
        {positionSection}
        {layoutSection}
        {typographySection}
      </div>
    );
  }

  if (isInteractive) {
    // Buttons / badges: fill + typography are primary
    return (
      <div>
        {fillSection}
        {typographySection}
        {effectsSection}
        {positionSection}
        {backgroundSection}
        {layoutSection}
      </div>
    );
  }

  // Sections and all other nodes: fill first, sensible defaults
  return (
    <div>
      {fillSection}
      {backgroundSection}
      {effectsSection}
      {positionSection}
      {layoutSection}
      {typographySection}
    </div>
  );
}

export function NodeMetaEditor({
  node,
  computed,
  onChange,
  swatches,
  elementType,
}: {
  node: NodeMeta;
  computed?: StyleProps;
  onChange: (patch: NodeMeta) => void;
  swatches?: string[];
  elementType?: string;
}) {
  return (
    <div className="space-y-0">
      <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <IdentityFields
          className={node.className}
          htmlId={node.htmlId}
          onClassName={(className) => onChange({ className })}
          onHtmlId={(htmlId) => onChange({ htmlId })}
        />
      </div>
      <StyleEditor
        styles={node.styles}
        computed={computed}
        onChange={(styles) => onChange({ styles })}
        swatches={swatches}
        elementType={elementType}
      />
    </div>
  );
}
