import type { StyleProps } from "@/lib/types";

export function rgbToHex(input: string): string {
  const value = input.trim();
  if (!value || value === "transparent" || value === "none") return "";
  if (value.startsWith("#")) {
    if (value.length === 4) {
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
    }
    return value.slice(0, 7).toLowerCase();
  }
  const match = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!match) return "";
  const hex = [match[1], match[2], match[3]]
    .map((part) => Math.round(Number(part)).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

export function hexToRgba(hex: string, alpha = 1) {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned.slice(0, 6);
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(0,0,0,${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function omitAuto(value: string) {
  if (!value || value === "auto" || value === "normal" || value === "none" || value === "0px") return "";
  return value;
}

function parseBlur(value: string) {
  const match = value.match(/blur\(([^)]+)\)/);
  return match?.[1] ?? "";
}

function mapWeight(value: string) {
  if (value === "normal") return "400";
  if (value === "bold") return "700";
  return value;
}

export function readComputedStyleProps(el: HTMLElement): StyleProps {
  const cs = getComputedStyle(el);
  const backgroundImage = cs.backgroundImage !== "none" ? cs.backgroundImage : "";
  const color = rgbToHex(cs.color);
  const background = rgbToHex(cs.backgroundColor);
  const borderColor = rgbToHex(cs.borderTopColor);
  return {
    display: cs.display || "",
    flexDirection: cs.flexDirection || "",
    justifyContent: cs.justifyContent || "",
    alignItems: cs.alignItems || "",
    gap: omitAuto(cs.gap),
    width: `${Math.round(el.offsetWidth)}px`,
    height: `${Math.round(el.offsetHeight)}px`,
    minWidth: omitAuto(cs.minWidth),
    maxWidth: omitAuto(cs.maxWidth),
    minHeight: omitAuto(cs.minHeight),
    maxHeight: omitAuto(cs.maxHeight),
    padding: {
      top: cs.paddingTop,
      right: cs.paddingRight,
      bottom: cs.paddingBottom,
      left: cs.paddingLeft,
    },
    margin: {
      top: cs.marginTop,
      right: cs.marginRight,
      bottom: cs.marginBottom,
      left: cs.marginLeft,
    },
    color,
    background,
    backgroundImage,
    fontSize: cs.fontSize,
    fontWeight: mapWeight(cs.fontWeight),
    fontStyle: cs.fontStyle !== "normal" ? cs.fontStyle : "",
    lineHeight: cs.lineHeight,
    letterSpacing: omitAuto(cs.letterSpacing),
    textAlign: cs.textAlign,
    textDecoration: cs.textDecorationLine !== "none" ? cs.textDecorationLine : "",
    textTransform: cs.textTransform !== "none" ? cs.textTransform : "",
    borderWidth: cs.borderTopWidth,
    borderStyle: cs.borderTopStyle,
    borderColor,
    borderRadius: cs.borderTopLeftRadius,
    boxShadow: cs.boxShadow !== "none" ? cs.boxShadow : "",
    opacity: cs.opacity,
    overflow: cs.overflow,
    position: cs.position,
    zIndex: cs.zIndex !== "auto" ? cs.zIndex : "",
    filterBlur: parseBlur(cs.filter),
    backdropBlur: parseBlur(cs.backdropFilter),
    cursor: cs.cursor !== "auto" ? cs.cursor : "",
  };
}

export function displayed<K extends keyof StyleProps>(stored: StyleProps | undefined, computed: StyleProps, key: K): string {
  const override = stored?.[key];
  if (typeof override === "string" && override) return override;
  const resolved = computed[key];
  return typeof resolved === "string" ? resolved : "";
}
