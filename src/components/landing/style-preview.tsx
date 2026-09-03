"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { resolveNodeStyles } from "@/lib/node-styles";
import { styleToCss } from "@/lib/styles";
import type { Breakpoint, InteractionState, NodeMeta } from "@/lib/types";

export type StylePreviewValue = {
  breakpoint: Breakpoint;
  previewState: InteractionState;
  live: boolean;
  previewNodeId?: string | null;
};

const StylePreviewContext = createContext<StylePreviewValue>({
  breakpoint: "desktop",
  previewState: "default",
  live: true,
  previewNodeId: null,
});

export function StylePreviewProvider({
  value,
  children,
}: {
  value: StylePreviewValue;
  children: ReactNode;
}) {
  return <StylePreviewContext.Provider value={value}>{children}</StylePreviewContext.Provider>;
}

export function useStylePreview() {
  return useContext(StylePreviewContext);
}

function previewFor(node: (NodeMeta & { id?: string }) | null | undefined, preview: StylePreviewValue): InteractionState {
  if (!node || preview.live || preview.previewState === "default") return "default";
  if (preview.previewNodeId && node.id && node.id !== preview.previewNodeId) return "default";
  return preview.previewState;
}

export function useNodeCss(node?: (NodeMeta & { id?: string }) | null): CSSProperties {
  const preview = useContext(StylePreviewContext);
  if (!node) return {};
  if (preview.live) return styleToCss(node.styles);
  return styleToCss(resolveNodeStyles(node, preview.breakpoint, previewFor(node, preview)));
}

export function usePreviewStateAttr(node?: (NodeMeta & { id?: string }) | null) {
  const preview = useContext(StylePreviewContext);
  const state = previewFor(node, preview);
  return state === "default" ? undefined : state;
}
