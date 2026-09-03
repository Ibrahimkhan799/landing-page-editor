import type { CSSProperties } from "react";
import type { BoxEdges, StyleProps } from "@/lib/types";

export const emptyBox = (): BoxEdges => ({ top: "", right: "", bottom: "", left: "" });

export function boxToCss(box?: Partial<BoxEdges>, prefix: "padding" | "margin" = "padding") {
  if (!box) return {};
  const out: Record<string, string> = {};
  if (box.top) out[`${prefix}Top`] = box.top;
  if (box.right) out[`${prefix}Right`] = box.right;
  if (box.bottom) out[`${prefix}Bottom`] = box.bottom;
  if (box.left) out[`${prefix}Left`] = box.left;
  return out;
}

function assign(out: CSSProperties, key: keyof CSSProperties, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  (out as Record<string, unknown>)[key] = value;
}

export function styleToCss(styles?: StyleProps): CSSProperties {
  if (!styles) return {};
  const out: CSSProperties = {};
  assign(out, "display", styles.display);
  assign(out, "flexDirection", styles.flexDirection);
  assign(out, "justifyContent", styles.justifyContent);
  assign(out, "alignItems", styles.alignItems);
  assign(out, "gap", styles.gap);
  assign(out, "width", styles.width);
  assign(out, "minWidth", styles.minWidth);
  assign(out, "maxWidth", styles.maxWidth);
  assign(out, "height", styles.height);
  assign(out, "minHeight", styles.minHeight);
  assign(out, "maxHeight", styles.maxHeight);
  assign(out, "color", styles.color);
  assign(out, "background", styles.background);
  assign(out, "backgroundImage", styles.backgroundImage);
  assign(out, "fontSize", styles.fontSize);
  assign(out, "fontWeight", styles.fontWeight);
  assign(out, "fontStyle", styles.fontStyle);
  assign(out, "lineHeight", styles.lineHeight);
  assign(out, "letterSpacing", styles.letterSpacing);
  assign(out, "textAlign", styles.textAlign);
  assign(out, "textDecoration", styles.textDecoration);
  assign(out, "textTransform", styles.textTransform);
  assign(out, "borderWidth", styles.borderWidth);
  assign(out, "borderStyle", styles.borderStyle);
  assign(out, "borderColor", styles.borderColor);
  assign(out, "borderRadius", styles.borderRadius);
  assign(out, "boxShadow", styles.boxShadow);
  assign(out, "opacity", styles.opacity);
  assign(out, "overflow", styles.overflow);
  assign(out, "position", styles.position);
  assign(out, "top", styles.top);
  assign(out, "right", styles.right);
  assign(out, "bottom", styles.bottom);
  assign(out, "left", styles.left);
  assign(out, "zIndex", styles.zIndex);
  assign(out, "cursor", styles.cursor);
  const rotate = styles.rotate ? `rotate(${styles.rotate})` : "";
  const scale = styles.scale ? `scale(${styles.scale})` : "";
  const transform = [rotate, scale].filter(Boolean).join(" ");
  assign(out, "transform", transform);
  assign(out, "filter", styles.filterBlur ? `blur(${styles.filterBlur})` : "");
  assign(out, "backdropFilter", styles.backdropBlur ? `blur(${styles.backdropBlur})` : "");
  Object.assign(out, boxToCss(styles.padding, "padding"), boxToCss(styles.margin, "margin"));
  return out;
}

export const STOCK_MEDIA = [
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
    label: "Team workshop",
  },
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=80",
    label: "Studio meeting",
  },
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80",
    label: "Collaboration",
  },
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
    label: "Analytics",
  },
  {
    type: "image" as const,
    src: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1400&q=80",
    label: "Product review",
  },
  {
    type: "video" as const,
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    label: "Sample clip",
  },
];
