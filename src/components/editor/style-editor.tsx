"use client";

import { ColorField } from "@/components/editor/color-field";
import { GradientField } from "@/components/editor/gradient-field";
import { MediaPicker } from "@/components/editor/media-picker";
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
import type { NodeMeta, StyleProps } from "@/lib/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
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
  onChange,
}: {
  styles?: StyleProps;
  onChange: (styles: StyleProps) => void;
}) {
  const current = styles ?? {};
  function patch(next: Partial<StyleProps>) {
    onChange({ ...current, ...next });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Display">
          <Select value={current.display || "block"} onValueChange={(value) => patch({ display: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["block", "flex", "grid", "inline-flex", "inline-block", "none"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Direction">
          <Select
            value={current.flexDirection || "row"}
            onValueChange={(value) => patch({ flexDirection: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["row", "column", "row-reverse", "column-reverse"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Justify">
          <Select
            value={current.justifyContent || "flex-start"}
            onValueChange={(value) => patch({ justifyContent: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["flex-start", "center", "flex-end", "space-between", "space-around"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Align">
          <Select value={current.alignItems || "stretch"} onValueChange={(value) => patch({ alignItems: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["stretch", "flex-start", "center", "flex-end"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Gap">
        <Input value={current.gap ?? ""} onChange={(event) => patch({ gap: event.target.value })} placeholder="12px" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width">
          <Input value={current.width ?? ""} onChange={(event) => patch({ width: event.target.value })} placeholder="100%" />
        </Field>
        <Field label="Height">
          <Input value={current.height ?? ""} onChange={(event) => patch({ height: event.target.value })} placeholder="auto" />
        </Field>
        <Field label="Max width">
          <Input
            value={current.maxWidth ?? ""}
            onChange={(event) => patch({ maxWidth: event.target.value })}
            placeholder="640px"
          />
        </Field>
        <Field label="Overflow">
          <Select value={current.overflow || "visible"} onValueChange={(value) => patch({ overflow: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["visible", "hidden", "auto", "scroll"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Separator />
      <SpacingField label="Padding" value={current.padding} onChange={(padding) => patch({ padding })} />
      <SpacingField label="Margin" value={current.margin} onChange={(margin) => patch({ margin })} />
      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography</p>
      <ColorField label="Text color" value={current.color ?? ""} onChange={(color) => patch({ color })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Size">
          <Input value={current.fontSize ?? ""} onChange={(event) => patch({ fontSize: event.target.value })} placeholder="16px" />
        </Field>
        <Field label="Weight">
          <Select value={current.fontWeight || "400"} onValueChange={(value) => patch({ fontWeight: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["300", "400", "500", "600", "700", "800"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Line height">
          <Input
            value={current.lineHeight ?? ""}
            onChange={(event) => patch({ lineHeight: event.target.value })}
            placeholder="1.5"
          />
        </Field>
        <Field label="Align">
          <Select value={current.textAlign || "left"} onValueChange={(value) => patch({ textAlign: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["left", "center", "right", "justify"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Background</p>
      <ColorField
        label="Background color"
        value={current.background ?? ""}
        onChange={(background) => patch({ background })}
      />
      <GradientField
        label="Gradient"
        value={current.backgroundImage ?? ""}
        onChange={(backgroundImage) => patch({ backgroundImage })}
      />
      <MediaPicker
        label="Background image"
        value={current.backgroundImage?.includes("url(") ? current.backgroundImage.slice(5, -2) : ""}
        onChange={(src) => patch({ backgroundImage: src ? `url("${src}")` : current.backgroundImage })}
      />
      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Border & effects</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width">
          <Input
            value={current.borderWidth ?? ""}
            onChange={(event) => patch({ borderWidth: event.target.value })}
            placeholder="1px"
          />
        </Field>
        <Field label="Style">
          <Select value={current.borderStyle || "none"} onValueChange={(value) => patch({ borderStyle: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["none", "solid", "dashed", "dotted"].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <ColorField
        label="Border color"
        value={current.borderColor ?? ""}
        onChange={(borderColor) => patch({ borderColor })}
      />
      <Field label="Radius">
        <Input
          value={current.borderRadius ?? ""}
          onChange={(event) => patch({ borderRadius: event.target.value })}
          placeholder="12px"
        />
      </Field>
      <Field label="Shadow">
        <Input
          value={current.boxShadow ?? ""}
          onChange={(event) => patch({ boxShadow: event.target.value })}
          placeholder="0 10px 30px rgba(0,0,0,.08)"
        />
      </Field>
      <Field label="Opacity">
        <Input value={current.opacity ?? ""} onChange={(event) => patch({ opacity: event.target.value })} placeholder="1" />
      </Field>
    </div>
  );
}

export function NodeMetaEditor({
  node,
  onChange,
}: {
  node: NodeMeta;
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
      <StyleEditor styles={node.styles} onChange={(styles) => onChange({ styles })} />
    </div>
  );
}
