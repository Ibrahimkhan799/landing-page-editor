"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useNodeCss, usePreviewStateAttr } from "@/components/landing/style-preview";
import { cn } from "@/lib/utils";
import type { PageElement } from "@/lib/types";

const headingSizes = {
  h1: "text-4xl md:text-6xl font-semibold tracking-tight",
  h2: "text-3xl md:text-4xl font-semibold tracking-tight",
  h3: "text-2xl font-semibold tracking-tight",
  h4: "text-xl font-semibold",
} as const;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function asBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function LandingElement({
  element,
  interactive = true,
}: {
  element: PageElement;
  interactive?: boolean;
}) {
  const p = element.props;
  const align = asString(p.align, "left");
  const alignClass =
    align === "center" ? "text-center mx-auto" : align === "right" ? "text-right ml-auto" : "";
  const nodeCss = useNodeCss(element);
  const previewState = usePreviewStateAttr(element);
  const meta = {
    id: element.htmlId || undefined,
    className: element.className || undefined,
    style: nodeCss,
    "data-editor-node": element.id,
    "data-preview-state": previewState,
  };

  switch (element.type) {
    case "heading": {
      const level = asString(p.level, "h2") as keyof typeof headingSizes;
      const Tag = (["h1", "h2", "h3", "h4"].includes(level) ? level : "h2") as "h1" | "h2" | "h3" | "h4";
      return (
        <Tag
          {...meta}
          className={cn(headingSizes[Tag], alignClass, element.className)}
          style={{ fontFamily: "var(--lp-font-heading)", ...nodeCss }}
        >
          {asString(p.text, "Heading")}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p
          {...meta}
          className={cn("max-w-2xl text-base leading-7", alignClass, element.className)}
          style={{ color: "var(--lp-muted-fg)", ...nodeCss }}
        >
          {asString(p.text, "")}
        </p>
      );
    case "button": {
      const variant = asString(p.variant, "primary");
      const size = asString(p.size, "md");
      const disabled = asBool(p.disabled);
      const href = asString(p.href, "#");
      const className = cn(
        "font-medium transition-colors",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-12 px-6 text-base",
        disabled && "pointer-events-none opacity-50",
        element.className,
      );
      const style = {
        ...(variant === "primary"
          ? { backgroundColor: "var(--lp-primary)", color: "var(--lp-primary-fg)", borderRadius: "var(--lp-radius)" }
          : variant === "secondary"
            ? { backgroundColor: "var(--lp-secondary)", color: "var(--lp-secondary-fg)", borderRadius: "var(--lp-radius)" }
            : {
                backgroundColor: "transparent",
                color: "var(--lp-fg)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--lp-border)",
                borderRadius: "var(--lp-radius)",
              }),
        ...nodeCss,
      };
      const shared = {
        id: element.htmlId || undefined,
        "data-editor-node": element.id,
        "data-preview-state": previewState,
        className: cn(className, "inline-flex items-center justify-center px-4 py-2"),
        style,
        "aria-disabled": disabled || undefined,
      };
      if (!interactive || disabled) {
        return <span {...shared}>{asString(p.label, "Button")}</span>;
      }
      return (
        <a {...shared} href={href}>
          {asString(p.label, "Button")}
        </a>
      );
    }
    case "input":
      return (
        <div className="grid w-full max-w-md gap-1">
          <Label className="text-xs">{asString(p.label, "Label")}</Label>
          <Input
            id={element.htmlId || undefined}
            data-editor-node={element.id}
            data-preview-state={previewState}
            className={cn("h-8 shadow-none", element.className)}
            type={asString(p.inputType, "text")}
            placeholder={asString(p.placeholder)}
            required={asBool(p.required)}
            disabled={!interactive}
            readOnly={!interactive}
            style={{ borderRadius: "var(--lp-radius)", ...nodeCss }}
            tabIndex={interactive ? 0 : -1}
          />
        </div>
      );
    case "textarea":
      return (
        <div className="grid w-full max-w-md gap-1">
          <Label className="text-xs">{asString(p.label, "Message")}</Label>
          <Textarea
            id={element.htmlId || undefined}
            data-editor-node={element.id}
            data-preview-state={previewState}
            className={cn("min-h-20 shadow-none", element.className)}
            placeholder={asString(p.placeholder)}
            rows={asNumber(p.rows, 4)}
            disabled={!interactive}
            readOnly={!interactive}
            style={{ borderRadius: "var(--lp-radius)", ...nodeCss }}
            tabIndex={interactive ? 0 : -1}
          />
        </div>
      );
    case "select": {
      const options = asString(p.options, "Option A\nOption B")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return (
        <div className="grid w-full max-w-md gap-1">
          <Label className="text-xs">{asString(p.label, "Select")}</Label>
          <Select disabled={!interactive}>
            <SelectTrigger
              id={element.htmlId || undefined}
              data-editor-node={element.id}
              data-preview-state={previewState}
              className={cn("h-8 shadow-none", element.className)}
              style={{ borderRadius: "var(--lp-radius)", ...nodeCss }}
            >
              <SelectValue placeholder={asString(p.placeholder, "Choose")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    case "checkbox":
      return (
        <label className={cn("flex items-center gap-2 text-sm", element.className)} id={element.htmlId || undefined} data-editor-node={element.id} data-preview-state={previewState} style={nodeCss}>
          <Checkbox disabled={!interactive} defaultChecked={asBool(p.checked)} />
          {asString(p.label, "Checkbox")}
        </label>
      );
    case "badge": {
      const variant = asString(p.variant, "primary");
      return (
        <Badge
          id={element.htmlId || undefined}
          data-editor-node={element.id}
          data-preview-state={previewState}
          className={element.className}
          style={{
            ...(variant === "primary"
              ? { backgroundColor: "var(--lp-primary)", color: "var(--lp-primary-fg)", borderColor: "transparent" }
              : variant === "accent"
                ? { backgroundColor: "var(--lp-accent)", color: "var(--lp-accent-fg)", borderColor: "transparent" }
                : { backgroundColor: "var(--lp-muted)", color: "var(--lp-fg)" }),
            ...nodeCss,
          }}
        >
          {asString(p.text, "Badge")}
        </Badge>
      );
    }
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          id={element.htmlId || undefined}
          data-editor-node={element.id}
          data-preview-state={previewState}
          src={asString(p.src)}
          alt={asString(p.alt, "")}
          className={cn("w-full object-cover", asBool(p.rounded, true) && "rounded-[var(--lp-radius)]", element.className)}
          style={nodeCss}
        />
      );
    case "video":
      return (
        <video
          id={element.htmlId || undefined}
          data-editor-node={element.id}
          data-preview-state={previewState}
          src={asString(p.src)}
          className={cn("w-full rounded-[var(--lp-radius)]", element.className)}
          style={nodeCss}
          controls={interactive}
          muted
          playsInline
        />
      );
    case "separator":
      return <Separator id={element.htmlId || undefined} data-editor-node={element.id} data-preview-state={previewState} className={cn(asString(p.spacing) === "lg" ? "my-8" : "my-4", element.className)} style={nodeCss} />;
    case "frame":
      return (
        <div
          {...meta}
          className={cn("min-h-[88px] w-full", element.className)}
          style={{
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "var(--lp-border)",
            borderRadius: "var(--lp-radius)",
            backgroundColor: "var(--lp-card)",
            padding: 16,
            ...nodeCss,
          }}
        >
          {asString(p.label) ? (
            <p className="text-[11px] font-medium text-zinc-500">{asString(p.label)}</p>
          ) : null}
        </div>
      );
    case "card":
      return (
        <Card
          id={element.htmlId || undefined}
          data-editor-node={element.id}
          data-preview-state={previewState}
          className={cn("max-w-sm", element.className)}
          style={{ borderRadius: "var(--lp-radius)", backgroundColor: "var(--lp-card)", ...nodeCss }}
        >
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--lp-font-heading)" }}>{asString(p.title)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm" style={{ color: "var(--lp-muted-fg)" }}>
              {asString(p.body)}
            </p>
          </CardContent>
          {asString(p.footer) ? <CardFooter className="text-sm font-medium">{asString(p.footer)}</CardFooter> : null}
        </Card>
      );
    default:
      return null;
  }
}

export function ElementStack({
  elements,
  interactive = true,
}: {
  elements: PageElement[];
  interactive?: boolean;
}) {
  if (!elements.length) return null;
  return (
    <div className="mt-6 flex flex-col items-start gap-4">
      {elements.map((element) => (
        <LandingElement key={element.id} element={element} interactive={interactive} />
      ))}
    </div>
  );
}
