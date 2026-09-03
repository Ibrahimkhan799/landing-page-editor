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

  switch (element.type) {
    case "heading": {
      const level = asString(p.level, "h2") as keyof typeof headingSizes;
      const Tag = (["h1", "h2", "h3", "h4"].includes(level) ? level : "h2") as "h1" | "h2" | "h3" | "h4";
      return (
        <Tag className={cn(headingSizes[Tag], alignClass)} style={{ fontFamily: "var(--lp-font-heading)" }}>
          {asString(p.text, "Heading")}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className={cn("max-w-2xl text-base leading-7", alignClass)} style={{ color: "var(--lp-muted-fg)" }}>
          {asString(p.text, "")}
        </p>
      );
    case "button": {
      const variant = asString(p.variant, "primary");
      const size = asString(p.size, "md");
      const className = cn(
        "font-medium",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-12 px-6 text-base",
      );
      const style =
        variant === "primary"
          ? { backgroundColor: "var(--lp-primary)", color: "var(--lp-primary-fg)", borderRadius: "var(--lp-radius)" }
          : variant === "secondary"
            ? { backgroundColor: "var(--lp-secondary)", color: "var(--lp-secondary-fg)", borderRadius: "var(--lp-radius)" }
            : {
                backgroundColor: "transparent",
                color: "var(--lp-fg)",
                border: "1px solid var(--lp-border)",
                borderRadius: "var(--lp-radius)",
              };
      if (!interactive) {
        return (
          <span className={cn(className, "inline-flex items-center justify-center px-4 py-2")} style={style}>
            {asString(p.label, "Button")}
          </span>
        );
      }
      return (
        <a href={asString(p.href, "#")} className={cn(className, "inline-flex items-center justify-center px-4 py-2")} style={style}>
          {asString(p.label, "Button")}
        </a>
      );
    }
    case "input":
      return (
        <div className="grid w-full max-w-md gap-2">
          <Label>{asString(p.label, "Label")}</Label>
          <Input
            type={asString(p.inputType, "text")}
            placeholder={asString(p.placeholder)}
            required={asBool(p.required)}
            disabled={!interactive}
            style={{ borderRadius: "var(--lp-radius)" }}
          />
        </div>
      );
    case "textarea":
      return (
        <div className="grid w-full max-w-md gap-2">
          <Label>{asString(p.label, "Message")}</Label>
          <Textarea
            placeholder={asString(p.placeholder)}
            rows={asNumber(p.rows, 4)}
            disabled={!interactive}
            style={{ borderRadius: "var(--lp-radius)" }}
          />
        </div>
      );
    case "select": {
      const options = asString(p.options, "Option A\nOption B")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return (
        <div className="grid w-full max-w-md gap-2">
          <Label>{asString(p.label, "Select")}</Label>
          <Select disabled={!interactive}>
            <SelectTrigger style={{ borderRadius: "var(--lp-radius)" }}>
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
        <label className="flex items-center gap-2 text-sm">
          <Checkbox disabled={!interactive} defaultChecked={asBool(p.checked)} />
          {asString(p.label, "Checkbox")}
        </label>
      );
    case "badge": {
      const variant = asString(p.variant, "primary");
      return (
        <Badge
          style={
            variant === "primary"
              ? { backgroundColor: "var(--lp-primary)", color: "var(--lp-primary-fg)", borderColor: "transparent" }
              : variant === "accent"
                ? { backgroundColor: "var(--lp-accent)", color: "var(--lp-accent-fg)", borderColor: "transparent" }
                : { backgroundColor: "var(--lp-muted)", color: "var(--lp-fg)" }
          }
        >
          {asString(p.text, "Badge")}
        </Badge>
      );
    }
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asString(p.src)}
          alt={asString(p.alt, "")}
          className={cn("w-full object-cover", asBool(p.rounded, true) && "rounded-[var(--lp-radius)]")}
        />
      );
    case "separator":
      return <Separator className={asString(p.spacing) === "lg" ? "my-8" : "my-4"} />;
    case "card":
      return (
        <Card className="max-w-sm" style={{ borderRadius: "var(--lp-radius)", background: "var(--lp-card)" }}>
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
    <div className="mt-8 flex flex-col items-start gap-4">
      {elements.map((element) => (
        <LandingElement key={element.id} element={element} interactive={interactive} />
      ))}
    </div>
  );
}
