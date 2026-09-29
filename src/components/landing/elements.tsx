"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AnimateHost, renderAnimatedText } from "@/components/landing/animate";
import { LandingRuntimeScope, useLandingRuntime } from "@/components/landing/runtime";
import {
  useNodeCss,
  usePreviewStateAttr,
} from "@/components/landing/style-preview";
import { bindElementsToItem, listItemKey, listItemValues } from "@/lib/component-slots";
import { normalizeConditionalElement } from "@/lib/migrate";
import { isContainerElement } from "@/lib/slots";
import { cn } from "@/lib/utils";
import type { PageElement } from "@/lib/types";
import type { CSSProperties, ReactNode } from "react";

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const SVG_TAGS: Record<string, string> = {
  svg: "svg",
  g: "g",
  path: "path",
  circle: "circle",
  ellipse: "ellipse",
  rect: "rect",
  line: "line",
  polyline: "polyline",
  polygon: "polygon",
  text: "text",
  tspan: "tspan",
  defs: "defs",
  lineargradient: "linearGradient",
  radialgradient: "radialGradient",
  stop: "stop",
  clippath: "clipPath",
  mask: "mask",
  pattern: "pattern",
  symbol: "symbol",
  use: "use",
  title: "title",
  desc: "desc",
};

const SVG_ATTRIBUTES: Record<string, string> = {
  xmlns: "xmlns",
  "xmlns:xlink": "xmlns:xlink",
  viewbox: "viewBox",
  width: "width",
  height: "height",
  x: "x",
  y: "y",
  x1: "x1",
  y1: "y1",
  x2: "x2",
  y2: "y2",
  cx: "cx",
  cy: "cy",
  r: "r",
  rx: "rx",
  ry: "ry",
  d: "d",
  points: "points",
  fill: "fill",
  "fill-opacity": "fill-opacity",
  "fill-rule": "fill-rule",
  stroke: "stroke",
  "stroke-width": "stroke-width",
  "stroke-linecap": "stroke-linecap",
  "stroke-linejoin": "stroke-linejoin",
  "stroke-opacity": "stroke-opacity",
  "clip-rule": "clip-rule",
  opacity: "opacity",
  transform: "transform",
  "vector-effect": "vector-effect",
  preserveaspectratio: "preserveAspectRatio",
  id: "id",
  class: "class",
  role: "role",
  "aria-hidden": "aria-hidden",
  "aria-label": "aria-label",
  focusable: "focusable",
  gradientunits: "gradientUnits",
  gradienttransform: "gradientTransform",
  offset: "offset",
  "stop-color": "stop-color",
  "stop-opacity": "stop-opacity",
  "clip-path": "clip-path",
  mask: "mask",
  patternunits: "patternUnits",
  patterncontentunits: "patternContentUnits",
  href: "href",
  "xlink:href": "xlink:href",
  "text-anchor": "text-anchor",
  "font-family": "font-family",
  "font-size": "font-size",
  "font-weight": "font-weight",
  dx: "dx",
  dy: "dy",
  "dominant-baseline": "dominant-baseline",
};

function escapeSvgValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeSvgAttribute(name: string, value: string) {
  const normalized = name.toLowerCase();
  const outputName = SVG_ATTRIBUTES[normalized];
  if (!outputName || /[\u0000-\u001f\u007f]/.test(value)) return null;

  if (normalized === "href" || normalized === "xlink:href") {
    if (!/^#[A-Za-z_][\w:.-]*$/.test(value.trim())) return null;
  }

  if (["fill", "stroke", "clip-path", "mask"].includes(normalized) && /url\s*\(/i.test(value)) {
    if (!/^url\(\s*#[A-Za-z_][\w:.-]*\s*\)$/.test(value.trim())) return null;
  }

  if (/\b(?:javascript|vbscript|data)\s*:/i.test(value)) return null;
  return `${outputName}="${escapeSvgValue(value)}"`;
}

function findSvgTagEnd(source: string, start: number) {
  let quote = "";
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

function sanitizeSvgTag(token: string) {
  const closing = token.match(/^<\s*\/\s*([A-Za-z][\w-]*)\s*>$/);
  if (closing) {
    const tag = SVG_TAGS[closing[1].toLowerCase()];
    return tag ? `</${tag}>` : "";
  }

  const opening = token.match(/^<\s*([A-Za-z][\w-]*)/);
  if (!opening) return "";
  const tag = SVG_TAGS[opening[1].toLowerCase()];
  if (!tag) return "";

  const attributes: string[] = [];
  const attributeSource = token.slice(opening[0].length, token.length - 1).replace(/\/\s*$/, "");
  const attributePattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of attributeSource.matchAll(attributePattern)) {
    const attribute = safeSvgAttribute(match[1], match[2] ?? match[3] ?? match[4] ?? "");
    if (attribute) attributes.push(attribute);
  }
  const suffix = /\/\s*>$/.test(token) ? "/>" : ">";
  return `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}${suffix}`;
}

/** Sanitizes stored SVG without relying on browser-only APIs during server rendering. */
export function sanitizeSvgMarkup(markup: string) {
  let output = "";
  let cursor = 0;

  while (cursor < markup.length) {
    const open = markup.indexOf("<", cursor);
    if (open === -1) {
      output += escapeSvgValue(markup.slice(cursor));
      break;
    }
    output += escapeSvgValue(markup.slice(cursor, open));
    const close = findSvgTagEnd(markup, open);
    if (close === -1) {
      output += "&lt;";
      cursor = open + 1;
      continue;
    }
    output += sanitizeSvgTag(markup.slice(open, close + 1));
    cursor = close + 1;
  }

  const root = output.search(/<svg(?:\s|>)/);
  return root === -1 ? "" : output.slice(root).trim();
}

/**
 * Extracts the CSS properties that must live on the wrapper div (the direct flex / grid child)
 * rather than only on the inner element. Without this, `shrink-0` and a fixed `width` on the
 * wrapper block the parent's flex algorithm and cause overflow in horizontal layouts.
 */
function childWrapperStyle(s: CSSProperties): CSSProperties {
  const style: CSSProperties = {};
  if (s.position === "absolute" || s.position === "fixed") return style;
  // These properties must live on the direct flex/grid child wrapper.
  if (s.width) style.width = s.width;
  if (s.minWidth) style.minWidth = s.minWidth;
  if (s.maxWidth) style.maxWidth = s.maxWidth;
  if (s.height && s.height !== "auto") style.height = s.height;
  if (s.flexGrow !== undefined) style.flexGrow = s.flexGrow;
  if (s.flexShrink !== undefined) style.flexShrink = s.flexShrink;
  if (s.flexBasis) style.flexBasis = s.flexBasis;
  if (s.alignSelf && s.alignSelf !== "auto") style.alignSelf = s.alignSelf;
  if (s.gridColumn) style.gridColumn = s.gridColumn;
  if (s.gridRow) style.gridRow = s.gridRow;
  if (s.marginTop) style.marginTop = s.marginTop;
  if (s.marginRight) style.marginRight = s.marginRight;
  if (s.marginBottom) style.marginBottom = s.marginBottom;
  if (s.marginLeft) style.marginLeft = s.marginLeft;
  return style;
}

function ElementLayoutWrapper({
  element,
  className,
  children,
}: {
  element: PageElement;
  className?: string;
  children: ReactNode;
}) {
  const runtime = useLandingRuntime(element.id);
  const resolved = {
    ...useNodeCss(element),
    ...runtime.styleOverrideFor(element.id),
  };
  if (runtime.isElementRemoved(element.id) || resolved.display === "none") return null;

  return (
    <div className={className} style={childWrapperStyle(resolved)}>
      {children}
    </div>
  );
}

export function LandingElement({
  element,
  interactive = true,
  renderChild,
  renderFrameEmpty,
  wrapChildren,
}: {
  element: PageElement;
  interactive?: boolean;
  renderChild?: (child: PageElement, parent: PageElement) => ReactNode;
  renderFrameEmpty?: (parent: PageElement) => ReactNode;
  wrapChildren?: (children: ReactNode, parent: PageElement) => ReactNode;
}) {
  const runtime = useLandingRuntime(element.id);
  const { props: p, errors: bindingErrors, condition: conditionMatches } = runtime.resolveElementProps(element);
  const textProp = (key: string, fallback = "") => {
    const value = asString(p[key], fallback);
    // Explicit bindings are data, not a second template to expand.
    return element.bindings?.[key] ? value : runtime.interpolate(value);
  };
  const align = asString(p.align, "left");
  const alignClass =
    align === "center"
      ? "text-center mx-auto"
      : align === "right"
        ? "text-right ml-auto"
        : "";
  const nodeCss = {
    ...useNodeCss(element),
    ...runtime.styleOverrideFor(element.id),
  };
  const previewState = usePreviewStateAttr(element);
  const interactionProps = runtime.interactionHandlers(element, interactive);
  const paintClass = cn(!interactive && "cursor-default select-none");
  const nodeAttributes = {
    id: element.htmlId || undefined,
    "data-editor-node": element.id,
    "data-style-source": element.styleSourceId,
    "data-binding-error": bindingErrors.length ? bindingErrors.join("; ") : undefined,
    "data-preview-state": previewState,
  };
  const meta = {
    ...interactionProps,
    ...nodeAttributes,
    className: cn(element.className, paintClass) || undefined,
    style: nodeCss,
  };

  if (runtime.isElementRemoved(element.id)) return null;

  switch (element.type) {
    case "heading": {
      const level = asString(p.level, "h2") as keyof typeof headingSizes;
      const Tag = (["h1", "h2", "h3", "h4"].includes(level) ? level : "h2") as
        "h1" | "h2" | "h3" | "h4";
      return (
        <Tag
          {...meta}
          className={cn(
            headingSizes[Tag],
            alignClass,
            element.className,
            paintClass,
          )}
          style={{
            fontFamily: "var(--lp-font-heading)",
            margin: 0,
            ...nodeCss,
          }}
        >
          {renderAnimatedText(element, textProp("text", "Heading"))}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p
          {...meta}
          className={cn(
            "max-w-2xl text-base leading-7",
            alignClass,
            element.className,
            paintClass,
          )}
          style={{ color: "var(--lp-muted-fg)", margin: 0, ...nodeCss }}
        >
          {renderAnimatedText(element, textProp("text"))}
        </p>
      );
    case "button": {
      const variant = asString(p.variant, "primary");
      const size = asString(p.size, "md");
      const disabled = asBool(p.disabled);
      const href = textProp("href", "#");
      const className = cn(
        "font-medium transition-colors",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-12 px-6 text-base",
        disabled && "pointer-events-none opacity-50",
        element.className,
      );
      const style = {
        ...(variant === "primary"
          ? {
              backgroundColor: "var(--lp-primary)",
              color: "var(--lp-primary-fg)",
              borderRadius: "var(--lp-radius)",
            }
          : variant === "secondary"
            ? {
                backgroundColor: "var(--lp-secondary)",
                color: "var(--lp-secondary-fg)",
                borderRadius: "var(--lp-radius)",
              }
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
        ...(disabled ? {} : interactionProps),
        ...nodeAttributes,
        className: cn(
          className,
          "inline-flex items-center justify-center px-4 py-2",
        ),
        style,
        "aria-disabled": disabled || undefined,
      };
      if (!interactive || disabled) {
        return (
          <span {...shared}>
            {renderAnimatedText(element, textProp("label", "Button"))}
          </span>
        );
      }
      if (element.interactions?.some((binding) => binding.trigger === "click")) {
        return (
          <button {...shared} type="button">
            {renderAnimatedText(element, textProp("label", "Button"))}
          </button>
        );
      }
      return (
        <a {...shared} href={href}>
          {renderAnimatedText(element, textProp("label", "Button"))}
        </a>
      );
    }
    case "input": {
      const label = textProp("label").trim();
      return (
        <div className="grid w-full gap-1">
          {label ? <Label className="text-xs">{label}</Label> : null}
          <Input
            {...interactionProps}
            {...nodeAttributes}
            className={cn("h-8 shadow-none", element.className)}
            type={asString(p.inputType, "text")}
            placeholder={textProp("placeholder")}
            defaultValue={p.value === undefined ? undefined : element.bindings?.value ? textProp("value") : runtime.interpolate(p.value)}
            required={asBool(p.required)}
            disabled={!interactive}
            readOnly={!interactive}
            style={{ borderRadius: "var(--lp-radius)", ...nodeCss }}
            tabIndex={interactive ? 0 : -1}
          />
        </div>
      );
    }
    case "textarea": {
      const label = textProp("label").trim();
      return (
        <div className="grid w-full gap-1">
          {label ? <Label className="text-xs">{label}</Label> : null}
          <Textarea
            {...interactionProps}
            {...nodeAttributes}
            className={cn("min-h-20 shadow-none", element.className)}
            placeholder={textProp("placeholder")}
            defaultValue={p.value === undefined ? undefined : element.bindings?.value ? textProp("value") : runtime.interpolate(p.value)}
            rows={asNumber(p.rows, 4)}
            disabled={!interactive}
            readOnly={!interactive}
            style={{ borderRadius: "var(--lp-radius)", ...nodeCss }}
            tabIndex={interactive ? 0 : -1}
          />
        </div>
      );
    }
    case "select": {
      const label = textProp("label").trim();
      const options = textProp("options", "Option A\nOption B")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const handlesChange = interactive && element.interactions?.some((binding) => binding.trigger === "change");
      const selectInteractionProps = { ...interactionProps, onChange: undefined };
      return (
        <div {...selectInteractionProps} className="grid w-full gap-1">
          {label ? <Label className="text-xs">{label}</Label> : null}
          <Select
            disabled={!interactive}
            onValueChange={handlesChange ? (value) => runtime.runInteractions(element, "change", value) : undefined}
          >
            <SelectTrigger
              {...nodeAttributes}
              className={cn("h-8 shadow-none", element.className)}
              style={{ borderRadius: "var(--lp-radius)", ...nodeCss }}
            >
              <SelectValue placeholder={textProp("placeholder", "Choose")} />
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
    case "checkbox": {
      const handlesChange = interactive && element.interactions?.some((binding) => binding.trigger === "change");
      const checkboxInteractionProps = { ...interactionProps, onChange: undefined };
      return (
        <label
          {...checkboxInteractionProps}
          className={cn("flex items-center gap-2 text-sm", element.className)}
          {...nodeAttributes}
          style={nodeCss}
        >
          <Checkbox
            disabled={!interactive}
            defaultChecked={asBool(p.checked)}
            onCheckedChange={handlesChange ? (checked) => runtime.runInteractions(element, "change", checked) : undefined}
          />
          {textProp("label", "Checkbox")}
        </label>
      );
    }
    case "badge": {
      const variant = asString(p.variant, "primary");
      return (
        <Badge
          {...interactionProps}
          {...nodeAttributes}
          className={element.className}
          style={{
            ...(variant === "primary"
              ? {
                  backgroundColor: "var(--lp-primary)",
                  color: "var(--lp-primary-fg)",
                  borderColor: "transparent",
                }
              : variant === "accent"
                ? {
                    backgroundColor: "var(--lp-accent)",
                    color: "var(--lp-accent-fg)",
                    borderColor: "transparent",
                  }
                : {
                    backgroundColor: "var(--lp-muted)",
                    color: "var(--lp-fg)",
                  }),
            ...nodeCss,
          }}
        >
          {textProp("text", "Badge")}
        </Badge>
      );
    }
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...interactionProps}
          {...nodeAttributes}
          src={textProp("src")}
          alt={textProp("alt")}
          className={cn(
            "w-full object-cover",
            asBool(p.rounded, true) && "rounded-[var(--lp-radius)]",
            element.className,
          )}
          style={nodeCss}
        />
      );
    case "video":
      return (
        <video
          {...interactionProps}
          {...nodeAttributes}
          src={textProp("src")}
          className={cn("w-full rounded-[var(--lp-radius)]", element.className)}
          style={nodeCss}
          controls={interactive}
          muted
          playsInline
        />
      );
    case "separator":
      return (
        <Separator
          {...interactionProps}
          {...nodeAttributes}
          className={cn(
            asString(p.spacing) === "lg" ? "my-8" : "my-4",
            element.className,
          )}
          style={nodeCss}
        />
      );
    case "shape": {
      const label = textProp("label");
      return (
        <div
          {...meta}
          aria-hidden={label ? undefined : true}
          aria-label={label || undefined}
          role={label ? "img" : undefined}
        />
      );
    }
    case "svg": {
      const label = textProp("label", "SVG graphic");
      const markup = sanitizeSvgMarkup(textProp("markup"));
      return (
        <div
          {...meta}
          aria-label={label || undefined}
          className={cn("inline-block [&>svg]:block [&>svg]:max-w-full", element.className, paintClass)}
          role={label ? "img" : undefined}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      );
    }
    case "frame": {
      const body = (
        <>
          {(element.children ?? []).map((child) => {
            const hasW = Boolean(child.styles?.width);
            const isCont = isContainerElement(child.type);
            return (
              <ElementLayoutWrapper
                key={child.id}
                element={child}
                className={cn("min-w-0", !hasW && !isCont && "w-max max-w-full")}
              >
                {renderChild ? (
                  renderChild(child, element)
                ) : (
                  <AnimateHost node={child}>
                    <LandingElement element={child} interactive={interactive} />
                  </AnimateHost>
                )}
              </ElementLayoutWrapper>
            );
          })}
          {renderFrameEmpty?.(element) ?? null}
        </>
      );
      return (
        <div
          {...meta}
          className={cn(
            "relative w-full min-h-[48px]",
            !(element.children ?? []).length &&
              !renderFrameEmpty &&
              "min-h-[72px]",
            element.className,
          )}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
            ...nodeCss,
          }}
        >
          {wrapChildren ? wrapChildren(body, element) : body}
        </div>
      );
    }
    case "slot": {
      const kids = element.children ?? [];
      const body = (
        <>
          {kids.map((child) => {
            const hasW = Boolean(child.styles?.width);
            const isCont = isContainerElement(child.type);
            return (
              <ElementLayoutWrapper
                key={child.id}
                element={child}
                className={cn("min-w-0", !hasW && !isCont && "w-max max-w-full")}
              >
                {renderChild ? (
                  renderChild(child, element)
                ) : (
                  <AnimateHost node={child}>
                    <LandingElement element={child} interactive={interactive} />
                  </AnimateHost>
                )}
              </ElementLayoutWrapper>
            );
          })}
          {renderFrameEmpty?.(element) ?? null}
        </>
      );
      return (
        <div
          {...meta}
          className={cn(
            "relative w-full min-h-[48px]",
            !kids.length && !renderFrameEmpty && "min-h-[72px]",
            element.className,
          )}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
            ...nodeCss,
          }}
          data-lp-slot={asString(p.name, "Slot")}
        >
          {wrapChildren ? wrapChildren(body, element) : body}
        </div>
      );
    }
    case "conditional": {
      const editing = Boolean(renderChild || renderFrameEmpty || wrapChildren);
      const visible = !runtime.enabled || conditionMatches === true;
      const branches = normalizeConditionalElement(element).children ?? [];
      const kids = editing || !runtime.enabled ? branches : branches.filter((child) => child.props.branch === (visible ? "then" : "else"));

      const body = (
        <>
          {kids.map((child) => {
            const hasW = Boolean(child.styles?.width);
            const isCont = isContainerElement(child.type);
            return (
              <ElementLayoutWrapper
                key={child.id}
                element={child}
                className={cn("min-w-0", !hasW && !isCont && "w-max max-w-full")}
              >
                {renderChild ? (
                  renderChild(child, element)
                ) : (
                  <AnimateHost node={child}>
                    <LandingElement element={child} interactive={interactive} />
                  </AnimateHost>
                )}
              </ElementLayoutWrapper>
            );
          })}
          {renderFrameEmpty?.(element) ?? null}
        </>
      );
      return (
        <div
          {...meta}
          className={cn(
            "relative w-full min-h-[48px]",
            !kids.length && !renderFrameEmpty && "min-h-[72px]",
            element.className,
          )}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "12px",
            ...nodeCss,
          }}
          data-lp-conditional={editing ? "editing" : visible ? "then" : "else"}
        >
          {wrapChildren ? wrapChildren(body, element) : body}
        </div>
      );
    }
    case "list": {
      const items: unknown[] = Array.isArray(p.items) ? p.items : [];
      const columns = Math.max(1, asNumber(p.columns, 3));
      const gap = asString(p.gap, "16px");
      const template = element.children ?? [];
      const editing = Boolean(renderChild || renderFrameEmpty || wrapChildren);

      // Editor: edit the real template (so DnD / selection / computed styles work).
      // Live preview: repeat bound clones for each item.
      if (editing) {
        const body = (
          <>
            {template.map((child) => {
              const hasW = Boolean(child.styles?.width);
              const isCont = isContainerElement(child.type);
              return (
                <ElementLayoutWrapper
                  key={child.id}
                  element={child}
                  className={cn("min-w-0", !hasW && !isCont && "w-max max-w-full")}
                >
                  {renderChild ? (
                    renderChild(child, element)
                  ) : (
                    <AnimateHost node={child}>
                      <LandingElement element={child} interactive={interactive} />
                    </AnimateHost>
                  )}
                </ElementLayoutWrapper>
              );
            })}
            {renderFrameEmpty?.(element) ?? null}
          </>
        );
        return (
          <div
            {...meta}
            className={cn("relative w-full min-h-[48px]", element.className)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: "12px",
              ...nodeCss,
            }}
            data-lp-list=""
          >
            <div className="pointer-events-none select-none text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              List template · {items.length} item{items.length === 1 ? "" : "s"}{" "}
              · {columns} col
            </div>
            <div
              className="relative rounded-md border border-dashed border-zinc-300/80 p-3"
              style={{
                background:
                  "color-mix(in srgb, var(--lp-muted) 35%, transparent)",
              }}
            >
              {wrapChildren ? wrapChildren(body, element) : body}
            </div>
            {items.length > 0 ? (
              <div
                className="pointer-events-none grid opacity-50"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap,
                }}
                aria-hidden
              >
                {items
                  .slice(0, Math.min(items.length, columns * 2))
                  .map((item, index) => {
                    const key = listItemKey(items, index);
                    const bound = bindElementsToItem(template, item, index, `${element.id}:preview:${key}`, !runtime.enabled);
                    return (
                      <LandingRuntimeScope key={key} nodeId={element.id} elements={bound} values={listItemValues(item, index)}>
                      <div className="min-w-0">
                        {bound.map((child) => (
                          <ElementLayoutWrapper
                            key={child.id}
                            element={child}
                            className={cn("block min-w-0", !child.styles?.width && "w-full")}
                          >
                            <AnimateHost node={child}>
                              <LandingElement element={child} interactive={false} />
                            </AnimateHost>
                          </ElementLayoutWrapper>
                        ))}
                      </div>
                      </LandingRuntimeScope>
                    );
                  })}
              </div>
            ) : null}
          </div>
        );
      }

      const liveGridTemplate =
        element.styles?.gridTemplateColumns ||
        `repeat(${columns}, minmax(0, 1fr))`;
      return (
        <div
          {...meta}
          className={cn("w-full", element.className)}
          style={{
            display: "grid",
            gridTemplateColumns: liveGridTemplate,
            gap,
            ...nodeCss,
          }}
        >
          {items.map((item, index) => {
            const key = listItemKey(items, index);
            const bound = template.length > 0
              ? bindElementsToItem(template, item, index, `${element.id}:row:${key}`, !runtime.enabled)
              : null;
            if (bound) {
              return (
                <LandingRuntimeScope key={key} nodeId={element.id} elements={bound} values={listItemValues(item, index)}>
                <div className="min-w-0">
                  {bound.map((child) => (
                    <AnimateHost
                      key={child.id}
                      node={child}
                      className="block w-full"
                    >
                      <LandingElement
                        element={child}
                        interactive={interactive}
                      />
                    </AnimateHost>
                  ))}
                </div>
                </LandingRuntimeScope>
              );
            }
            const record = asRecord(item) ?? {};
            return (
              <div
                key={key}
                className="rounded-xl border bg-white p-5 shadow-sm"
                style={{
                  borderColor: "var(--lp-border)",
                  borderRadius: "var(--lp-radius)",
                }}
              >
                <div
                  className="mb-3 grid size-8 place-items-center rounded-md text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--lp-primary)" }}
                >
                  {String(record.badge ?? index + 1)}
                </div>
                <h3
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--lp-font-heading)" }}
                >
                  {String(record.title ?? `Item ${index + 1}`)}
                </h3>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--lp-muted-fg)" }}
                >
                  {String(record.body ?? "")}
                </p>
              </div>
            );
          })}
        </div>
      );
    }
    case "card":
      return (
        <Card
          {...interactionProps}
          {...nodeAttributes}
          className={cn("max-w-sm", element.className)}
          style={{
            borderRadius: "var(--lp-radius)",
            backgroundColor: "var(--lp-card)",
            ...nodeCss,
          }}
        >
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--lp-font-heading)" }}>
              {textProp("title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm" style={{ color: "var(--lp-muted-fg)" }}>
              {textProp("body")}
            </p>
          </CardContent>
          {asString(p.footer) ? (
            <CardFooter className="text-sm font-medium">
              {textProp("footer")}
            </CardFooter>
          ) : null}
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
        <ElementLayoutWrapper
          key={element.id}
          element={element}
          className={cn("min-w-0", !element.styles?.width && !isContainerElement(element.type) && "w-max max-w-full")}
        >
          <AnimateHost node={element}>
            <LandingElement element={element} interactive={interactive} />
          </AnimateHost>
        </ElementLayoutWrapper>
      ))}
    </div>
  );
}
