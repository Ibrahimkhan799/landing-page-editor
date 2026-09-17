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
import {
  useNodeCss,
  usePreviewStateAttr,
} from "@/components/landing/style-preview";
import { bindElementToItem } from "@/lib/component-slots";
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

/**
 * Extracts the CSS properties that must live on the wrapper div (the direct flex / grid child)
 * rather than only on the inner element. Without this, `shrink-0` and a fixed `width` on the
 * wrapper block the parent's flex algorithm and cause overflow in horizontal layouts.
 */
function childWrapperStyle(child: PageElement): CSSProperties {
  const s = child.styles;
  if (!s) return {};
  const style: CSSProperties = {};
  // Sizing — on the wrapper so flex/grid measure the right size
  if (s.width) style.width = s.width;
  if (s.minWidth) style.minWidth = s.minWidth;
  if (s.maxWidth) style.maxWidth = s.maxWidth;
  if (s.height && s.height !== "auto") style.height = s.height;
  // Flex item properties — must be on the direct flex child
  const grow = parseFloat(s.flexGrow ?? "");
  if (!isNaN(grow)) style.flexGrow = grow;
  const shrink = parseFloat(s.flexShrink ?? "");
  if (!isNaN(shrink)) style.flexShrink = shrink;
  if (s.flexBasis) style.flexBasis = s.flexBasis;
  if (s.alignSelf && s.alignSelf !== "auto") style.alignSelf = s.alignSelf;
  // Grid item placement
  if (s.gridColumn) style.gridColumn = s.gridColumn;
  if (s.gridRow) style.gridRow = s.gridRow;
  // Margin needs to be on the wrapper so it participates in the parent's layout
  if (s.margin) {
    if (s.margin.top) style.marginTop = s.margin.top;
    if (s.margin.right) style.marginRight = s.margin.right;
    if (s.margin.bottom) style.marginBottom = s.margin.bottom;
    if (s.margin.left) style.marginLeft = s.margin.left;
  }
  return style;
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
  const p = element.props;
  const align = asString(p.align, "left");
  const alignClass =
    align === "center"
      ? "text-center mx-auto"
      : align === "right"
        ? "text-right ml-auto"
        : "";
  const nodeCss = useNodeCss(element);
  const previewState = usePreviewStateAttr(element);
  const paintClass = cn(!interactive && "cursor-default select-none");
  const meta = {
    id: element.htmlId || undefined,
    className: cn(element.className, paintClass) || undefined,
    style: nodeCss,
    "data-editor-node": element.id,
    "data-preview-state": previewState,
  };

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
          {renderAnimatedText(element, asString(p.text, "Heading"))}
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
          {renderAnimatedText(element, asString(p.text, ""))}
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
        id: element.htmlId || undefined,
        "data-editor-node": element.id,
        "data-preview-state": previewState,
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
            {renderAnimatedText(element, asString(p.label, "Button"))}
          </span>
        );
      }
      return (
        <a {...shared} href={href}>
          {renderAnimatedText(element, asString(p.label, "Button"))}
        </a>
      );
    }
    case "input": {
      const label = typeof p.label === "string" ? p.label.trim() : "";
      return (
        <div className="grid w-full gap-1">
          {label ? <Label className="text-xs">{label}</Label> : null}
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
    }
    case "textarea": {
      const label = typeof p.label === "string" ? p.label.trim() : "";
      return (
        <div className="grid w-full gap-1">
          {label ? <Label className="text-xs">{label}</Label> : null}
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
    }
    case "select": {
      const label = typeof p.label === "string" ? p.label.trim() : "";
      const options = asString(p.options, "Option A\nOption B")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return (
        <div className="grid w-full gap-1">
          {label ? <Label className="text-xs">{label}</Label> : null}
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
        <label
          className={cn("flex items-center gap-2 text-sm", element.className)}
          id={element.htmlId || undefined}
          data-editor-node={element.id}
          data-preview-state={previewState}
          style={nodeCss}
        >
          <Checkbox
            disabled={!interactive}
            defaultChecked={asBool(p.checked)}
          />
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
      return (
        <Separator
          id={element.htmlId || undefined}
          data-editor-node={element.id}
          data-preview-state={previewState}
          className={cn(
            asString(p.spacing) === "lg" ? "my-8" : "my-4",
            element.className,
          )}
          style={nodeCss}
        />
      );
    case "frame": {
      const body = (
        <>
          {(element.children ?? []).map((child) => {
            const hasW = Boolean(child.styles?.width);
            const isCont = isContainerElement(child.type);
            return (
              <div
                key={child.id}
                className={cn("min-w-0", !hasW && !isCont && "w-max max-w-full")}
                style={childWrapperStyle(child)}
              >
                {renderChild ? (
                  renderChild(child, element)
                ) : (
                  <AnimateHost node={child}>
                    <LandingElement element={child} interactive={interactive} />
                  </AnimateHost>
                )}
              </div>
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
              <div
                key={child.id}
                className={cn("min-w-0", !hasW && !isCont && "w-max max-w-full")}
                style={childWrapperStyle(child)}
              >
                {renderChild ? (
                  renderChild(child, element)
                ) : (
                  <AnimateHost node={child}>
                    <LandingElement element={child} interactive={interactive} />
                  </AnimateHost>
                )}
              </div>
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
    case "list": {
      const items = Array.isArray(p.items)
        ? (p.items as Record<string, unknown>[])
        : [];
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
                <div
                  key={child.id}
                  className={cn("min-w-0", !hasW && !isCont && "w-max max-w-full")}
                  style={childWrapperStyle(child)}
                >
                  {renderChild ? (
                    renderChild(child, element)
                  ) : (
                    <AnimateHost node={child}>
                      <LandingElement element={child} interactive={interactive} />
                    </AnimateHost>
                  )}
                </div>
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
                    const bound = template.map((child) =>
                      bindElementToItem(child, item, index),
                    );
                    return (
                      <div key={index} className="min-w-0">
                        {bound.map((child) => (
                          <div
                            key={child.id}
                            className={cn("block min-w-0", !child.styles?.width && "w-full")}
                            style={childWrapperStyle(child)}
                          >
                            <AnimateHost node={child}>
                              <LandingElement element={child} interactive={false} />
                            </AnimateHost>
                          </div>
                        ))}
                      </div>
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
            const bound =
              template.length > 0
                ? template.map((child) => bindElementToItem(child, item, index))
                : null;
            if (bound) {
              return (
                <div key={index} className="min-w-0">
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
              );
            }
            return (
              <div
                key={index}
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
                  {String(item.badge ?? index + 1)}
                </div>
                <h3
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--lp-font-heading)" }}
                >
                  {String(item.title ?? `Item ${index + 1}`)}
                </h3>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--lp-muted-fg)" }}
                >
                  {String(item.body ?? "")}
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
          id={element.htmlId || undefined}
          data-editor-node={element.id}
          data-preview-state={previewState}
          className={cn("max-w-sm", element.className)}
          style={{
            borderRadius: "var(--lp-radius)",
            backgroundColor: "var(--lp-card)",
            ...nodeCss,
          }}
        >
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--lp-font-heading)" }}>
              {asString(p.title)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm" style={{ color: "var(--lp-muted-fg)" }}>
              {asString(p.body)}
            </p>
          </CardContent>
          {asString(p.footer) ? (
            <CardFooter className="text-sm font-medium">
              {asString(p.footer)}
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
        <div
          key={element.id}
          className={cn("min-w-0", !element.styles?.width && !isContainerElement(element.type) && "w-max max-w-full")}
          style={childWrapperStyle(element)}
        >
          <AnimateHost node={element}>
            <LandingElement element={element} interactive={interactive} />
          </AnimateHost>
        </div>
      ))}
    </div>
  );
}
