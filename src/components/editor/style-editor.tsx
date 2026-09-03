"use client";

import { BlurPopover } from "@/components/editor/blur-popover";
import { ColorField, OpacitySlider } from "@/components/editor/color-field";
import { FillPopover } from "@/components/editor/fill-popover";
import { ShadowPopover } from "@/components/editor/shadow-popover";
import { SpacingField } from "@/components/editor/spacing-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayed } from "@/lib/computed-styles";
import type { NodeMeta, StyleProps } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
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
        <SelectTrigger className="h-8">
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
}: {
  styles?: StyleProps;
  computed?: StyleProps;
  onChange: (styles: StyleProps) => void;
}) {
  const current = styles ?? {};
  const live = computed ?? {};
  function patch(next: Partial<StyleProps>) {
    onChange({ ...current, ...next });
  }
  function show(key: keyof StyleProps) {
    return displayed(current, live, key);
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Fill & stroke</SectionTitle>
      <FillPopover styles={current} computed={live} onChange={patch} />
      <ColorField label="Text" value={current.color} resolved={live.color} onChange={(color) => patch({ color })} />
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
      />
      <Field label="Radius">
        <Input
          value={current.borderRadius || live.borderRadius || ""}
          onChange={(event) => patch({ borderRadius: event.target.value })}
        />
      </Field>
      <Separator />
      <SectionTitle>Effects</SectionTitle>
      <ShadowPopover value={current.boxShadow} resolved={live.boxShadow} onChange={(boxShadow) => patch({ boxShadow })} />
      <BlurPopover
        layer={current.filterBlur}
        backdrop={current.backdropBlur}
        resolvedLayer={live.filterBlur}
        resolvedBackdrop={live.backdropBlur}
        onChange={patch}
      />
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Opacity</Label>
        <OpacitySlider value={show("opacity") || "1"} onChange={(opacity) => patch({ opacity })} />
      </div>
      <Separator />
      <SectionTitle>Typography</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size">
          <Input value={current.fontSize || live.fontSize || ""} onChange={(event) => patch({ fontSize: event.target.value })} />
        </Field>
        <SelectField
          label="Weight"
          value={show("fontWeight") || "400"}
          options={["300", "400", "500", "600", "700", "800"]}
          onChange={(fontWeight) => patch({ fontWeight })}
        />
        <Field label="Line">
          <Input value={current.lineHeight || live.lineHeight || ""} onChange={(event) => patch({ lineHeight: event.target.value })} />
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
      <Separator />
      <SectionTitle>Position & size</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="W">
          <Input value={current.width || live.width || ""} onChange={(event) => patch({ width: event.target.value })} />
        </Field>
        <Field label="H">
          <Input value={current.height || live.height || ""} onChange={(event) => patch({ height: event.target.value })} />
        </Field>
        <Field label="Min W">
          <Input value={current.minWidth || live.minWidth || ""} onChange={(event) => patch({ minWidth: event.target.value })} />
        </Field>
        <Field label="Min H">
          <Input value={current.minHeight || live.minHeight || ""} onChange={(event) => patch({ minHeight: event.target.value })} />
        </Field>
        <Field label="Max W">
          <Input value={current.maxWidth || live.maxWidth || ""} onChange={(event) => patch({ maxWidth: event.target.value })} />
        </Field>
        <Field label="Max H">
          <Input value={current.maxHeight || live.maxHeight || ""} onChange={(event) => patch({ maxHeight: event.target.value })} />
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
          <Input value={current.zIndex || live.zIndex || ""} placeholder="auto" onChange={(event) => patch({ zIndex: event.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Rotate">
          <Input value={current.rotate ?? ""} placeholder="0deg" onChange={(event) => patch({ rotate: event.target.value })} />
        </Field>
        <Field label="Scale">
          <Input value={current.scale ?? ""} placeholder="1" onChange={(event) => patch({ scale: event.target.value })} />
        </Field>
      </div>
      <Separator />
      <SectionTitle>Auto layout</SectionTitle>
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
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Gap">
          <Input value={current.gap || live.gap || ""} onChange={(event) => patch({ gap: event.target.value })} />
        </Field>
        <SelectField
          label="Overflow"
          value={show("overflow") || "visible"}
          options={["visible", "hidden", "auto", "scroll", "clip"]}
          onChange={(overflow) => patch({ overflow })}
        />
      </div>
      <SpacingField label="Padding" value={current.padding ?? live.padding} onChange={(padding) => patch({ padding })} />
      <SpacingField label="Margin" value={current.margin ?? live.margin} onChange={(margin) => patch({ margin })} />
    </div>
  );
}

export function NodeMetaEditor({
  node,
  computed,
  onChange,
}: {
  node: NodeMeta;
  computed?: StyleProps;
  onChange: (patch: NodeMeta) => void;
}) {
  return (
    <div className="space-y-4">
      <IdentityFields
        className={node.className}
        htmlId={node.htmlId}
        onClassName={(className) => onChange({ className })}
        onHtmlId={(htmlId) => onChange({ htmlId })}
      />
      <StyleEditor styles={node.styles} computed={computed} onChange={(styles) => onChange({ styles })} />
    </div>
  );
}
