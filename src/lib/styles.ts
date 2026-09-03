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

export function styleToCss(styles?: StyleProps): CSSProperties {
  if (!styles) return {};
  const rotate = styles.rotate ? `rotate(${styles.rotate})` : "";
  const scale = styles.scale ? `scale(${styles.scale})` : "";
  const transform = [rotate, scale].filter(Boolean).join(" ") || undefined;
  return {
    display: styles.display || undefined,
    flexDirection: styles.flexDirection as CSSProperties["flexDirection"],
    justifyContent: styles.justifyContent,
    alignItems: styles.alignItems,
    gap: styles.gap || undefined,
    width: styles.width || undefined,
    minWidth: styles.minWidth || undefined,
    maxWidth: styles.maxWidth || undefined,
    height: styles.height || undefined,
    minHeight: styles.minHeight || undefined,
    maxHeight: styles.maxHeight || undefined,
    color: styles.color || undefined,
    background: styles.background || undefined,
    backgroundImage: styles.backgroundImage || undefined,
    fontSize: styles.fontSize || undefined,
    fontWeight: styles.fontWeight || undefined,
    fontStyle: styles.fontStyle as CSSProperties["fontStyle"],
    lineHeight: styles.lineHeight || undefined,
    letterSpacing: styles.letterSpacing || undefined,
    textAlign: styles.textAlign as CSSProperties["textAlign"],
    textDecoration: styles.textDecoration || undefined,
    textTransform: styles.textTransform as CSSProperties["textTransform"],
    borderWidth: styles.borderWidth || undefined,
    borderStyle: styles.borderStyle || undefined,
    borderColor: styles.borderColor || undefined,
    borderRadius: styles.borderRadius || undefined,
    boxShadow: styles.boxShadow || undefined,
    opacity: styles.opacity || undefined,
    overflow: styles.overflow || undefined,
    position: styles.position as CSSProperties["position"],
    top: styles.top || undefined,
    right: styles.right || undefined,
    bottom: styles.bottom || undefined,
    left: styles.left || undefined,
    zIndex: styles.zIndex || undefined,
    transform,
    filter: styles.filterBlur ? `blur(${styles.filterBlur})` : undefined,
    backdropFilter: styles.backdropBlur ? `blur(${styles.backdropBlur})` : undefined,
    cursor: styles.cursor || undefined,
    ...boxToCss(styles.padding, "padding"),
    ...boxToCss(styles.margin, "margin"),
  };
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
