"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BlurPopover } from "@/components/editor/blur-popover";
import { ColorField, OpacitySlider } from "@/components/editor/color-field";
import { FillPopover } from "@/components/editor/fill-popover";
import { ShadowPopover } from "@/components/editor/shadow-popover";
import { SpacingField } from "@/components/editor/spacing-field";
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

  const isText = elementType === "heading" || elementType === "paragraph";
  const isContainer = elementType === "frame" || elementType === "slot" || elementType === "list";
  const isMedia = elementType === "image" || elementType === "video";
  const isInteractive = elementType === "button" || elementType === "badge";

  // ── Section content blocks ──────────────────────────────────────────────

  const fillSection = (
    <CollapsibleSection title="Fill & stroke" defaultOpen>
      <FillPopover styles={current} computed={live} onChange={patch} swatches={swatches} />
      <ColorField
        label="Text"
        value={current.color}
        resolved={live.color}
        onChange={(color) => patch({ color })}
        swatches={swatches}
      />
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
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size">
          <Input
            value={current.fontSize || live.fontSize || ""}
            onChange={(event) => patch({ fontSize: event.target.value })}
          />
        </Field>
        <SelectField
          label="Weight"
          value={show("fontWeight") || "400"}
          options={["300", "400", "500", "600", "700", "800"]}
          onChange={(fontWeight) => patch({ fontWeight })}
        />
        <Field label="Line">
          <Input
            value={current.lineHeight || live.lineHeight || ""}
            onChange={(event) => patch({ lineHeight: event.target.value })}
          />
        </Field>
        <Field label="Letter">
          <Input
            value={current.letterSpacing || live.letterSpacing || ""}
            placeholder="0"
            onChange={(event) => patch({ letterSpacing: event.target.value })}
          />
        </Field>
        <SelectField
          label="Align"
          value={show("textAlign") || "left"}
          options={["left", "center", "right", "justify"]}
          onChange={(textAlign) => patch({ textAlign })}
        />
        <SelectField
          label="Transform"
          value={show("textTransform") || "none"}
          options={["none", "uppercase", "lowercase", "capitalize"]}
          onChange={(textTransform) => patch({ textTransform })}
        />
        <SelectField
          label="Decoration"
          value={show("textDecoration") || "none"}
          options={["none", "underline", "line-through", "overline"]}
          onChange={(textDecoration) => patch({ textDecoration })}
        />
        <SelectField
          label="Style"
          value={show("fontStyle") || "normal"}
          options={["normal", "italic"]}
          onChange={(fontStyle) => patch({ fontStyle })}
        />
      </div>
    </CollapsibleSection>
  );

  const positionSection = (
    <CollapsibleSection title="Position & size" defaultOpen={!isContainer}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="W">
          <Input
            value={current.width || live.width || ""}
            onChange={(event) => patch({ width: event.target.value })}
          />
        </Field>
        <Field label="H">
          <Input
            value={current.height || live.height || ""}
            onChange={(event) => patch({ height: event.target.value })}
          />
        </Field>
        <Field label="Min W">
          <Input
            value={current.minWidth || live.minWidth || ""}
            onChange={(event) => patch({ minWidth: event.target.value })}
          />
        </Field>
        <Field label="Min H">
          <Input
            value={current.minHeight || live.minHeight || ""}
            onChange={(event) => patch({ minHeight: event.target.value })}
          />
        </Field>
        <Field label="Max W">
          <Input
            value={current.maxWidth || live.maxWidth || ""}
            onChange={(event) => patch({ maxWidth: event.target.value })}
          />
        </Field>
        <Field label="Max H">
          <Input
            value={current.maxHeight || live.maxHeight || ""}
            onChange={(event) => patch({ maxHeight: event.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Position"
          value={show("position")}
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
        <Field label="Translate X">
          <Input
            value={current.translateX ?? ""}
            placeholder="0px"
            onChange={(event) => patch({ translateX: event.target.value })}
          />
        </Field>
        <Field label="Translate Y">
          <Input
            value={current.translateY ?? ""}
            placeholder="0px"
            onChange={(event) => patch({ translateY: event.target.value })}
          />
        </Field>
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
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Display"
          value={show("display")}
          options={["block", "flex", "grid", "inline-flex", "inline-block", "inline", "none"]}
          onChange={(display) => patch({ display })}
        />
        <SelectField
          label="Direction"
          value={show("flexDirection") || "row"}
          options={["row", "column", "row-reverse", "column-reverse"]}
          onChange={(flexDirection) => patch({ flexDirection })}
        />
        <SelectField
          label="Justify"
          value={show("justifyContent") || "flex-start"}
          options={["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]}
          onChange={(justifyContent) => patch({ justifyContent })}
        />
        <SelectField
          label="Align"
          value={show("alignItems") || "stretch"}
          options={["stretch", "flex-start", "center", "flex-end", "baseline"]}
          onChange={(alignItems) => patch({ alignItems })}
        />
        <SelectField
          label="Wrap"
          value={show("flexWrap") || "nowrap"}
          options={["nowrap", "wrap", "wrap-reverse"]}
          onChange={(flexWrap) => patch({ flexWrap: flexWrap === "nowrap" ? "" : flexWrap })}
        />
        <Field label="Gap">
          <Input
            value={current.gap || live.gap || ""}
            onChange={(event) => patch({ gap: event.target.value })}
          />
        </Field>
      </div>
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
      <div className="grid grid-cols-3 gap-2">
        <Field label="Grow">
          <Input
            value={current.flexGrow || ""}
            placeholder="0"
            onChange={(event) => patch({ flexGrow: event.target.value })}
          />
        </Field>
        <Field label="Shrink">
          <Input
            value={current.flexShrink || ""}
            placeholder="1"
            onChange={(event) => patch({ flexShrink: event.target.value })}
          />
        </Field>
        <Field label="Basis">
          <Input
            value={current.flexBasis || ""}
            placeholder="auto"
            onChange={(event) => patch({ flexBasis: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Grid cols">
        <Input
          value={current.gridTemplateColumns || ""}
          placeholder="1fr 1fr"
          onChange={(event) => patch({ gridTemplateColumns: event.target.value })}
        />
      </Field>
      <Field label="Grid rows">
        <Input
          value={current.gridTemplateRows || ""}
          placeholder="auto"
          onChange={(event) => patch({ gridTemplateRows: event.target.value })}
        />
      </Field>
      <SpacingField label="Padding" value={current.padding ?? live.padding} onChange={(padding) => patch({ padding })} />
      <SpacingField label="Margin" value={current.margin ?? live.margin} onChange={(margin) => patch({ margin })} />
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
