export type DropPoint = { x: number; y: number };
export type DropRect = { left: number; top: number; width: number; height: number };
export type DropLayout = { axis: "x" | "y"; reverse: boolean; mode: "flow" | "flex" | "grid" };
export type DropEdge = "before" | "after";
export type LayoutHint = DropRect & { mode: "edge" | "container" };

export const verticalLayout: DropLayout = { axis: "y", reverse: false, mode: "flow" };

export function layoutFromStyle(style: {
  display?: string;
  flexDirection?: string;
  direction?: string;
  gridAutoFlow?: string;
}): DropLayout {
  const rtl = style.direction === "rtl";
  if (style.display?.includes("grid")) {
    const axis = style.gridAutoFlow?.startsWith("column") ? "y" : "x";
    return { axis, reverse: axis === "x" && rtl, mode: "grid" };
  }
  if (style.display?.includes("flex")) {
    const direction = style.flexDirection || "row";
    const axis = direction.startsWith("row") ? "x" : "y";
    return { axis, reverse: direction.endsWith("reverse") !== (axis === "x" && rtl), mode: "flex" };
  }
  return verticalLayout;
}

// All geometry is in client pixels, including zoom. Only the edge band's cap
// uses the element's CSS-to-client scale; never divide pointer coordinates.
export function resolveLayoutDrop({ rect, point, layout = verticalLayout, container = false, scale = 1 }: {
  rect: DropRect;
  point: DropPoint;
  layout?: DropLayout;
  container?: boolean;
  scale?: number;
}): { edge: DropEdge | null; hint: LayoutHint } {
  // DOMRect properties live on its prototype and cannot be spread directly.
  rect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  const start = layout.axis === "x" ? rect.left : rect.top;
  const size = layout.axis === "x" ? rect.width : rect.height;
  const position = (layout.axis === "x" ? point.x : point.y) - start;
  const band = Math.min(size * 0.2, 16 * Math.max(0.01, scale));
  if (container && position > band && position < size - band) {
    return { edge: null, hint: { mode: "container", ...rect } };
  }
  const trailing = position >= size / 2;
  const edge: DropEdge = trailing !== layout.reverse ? "after" : "before";
  const boundary = start + (trailing ? size : 0);
  return {
    edge,
    hint: layout.axis === "x"
      ? { mode: "edge", left: boundary - 1, top: rect.top, width: 2, height: rect.height }
      : { mode: "edge", left: rect.left, top: boundary - 1, width: rect.width, height: 2 },
  };
}

export function centerOf(rect: DropRect): DropPoint {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function gapHint(rect: DropRect, layout = verticalLayout): LayoutHint {
  const center = centerOf(rect);
  return layout.axis === "x"
    ? { mode: "edge", left: center.x - 1, top: rect.top, width: 2, height: rect.height }
    : { mode: "edge", left: rect.left, top: center.y - 1, width: rect.width, height: 2 };
}

export function keyboardDropPoints(rect: DropRect, layout: DropLayout, container: boolean): DropPoint[] {
  const center = centerOf(rect);
  const size = layout.axis === "x" ? rect.width : rect.height;
  const inset = Math.min(size * 0.1, 1);
  const start = layout.axis === "x" ? rect.left : rect.top;
  return [
    { ...center, [layout.axis]: start + inset },
    ...(container ? [center] : []),
    { ...center, [layout.axis]: start + size - inset },
  ];
}

export function nextKeyboardPoint<T extends { point: DropPoint }>(
  candidates: T[], current: DropPoint, key: string,
): T | undefined {
  const axis = key === "ArrowLeft" || key === "ArrowRight" ? "x" : "y";
  const sign = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const cross = axis === "x" ? "y" : "x";
  return candidates
    .filter(({ point }) => (point[axis] - current[axis]) * sign > 0.5)
    .sort((a, b) => {
      const score = (point: DropPoint) => Math.abs(point[axis] - current[axis]) + Math.abs(point[cross] - current[cross]) * 4;
      return score(a.point) - score(b.point);
    })[0];
}

export function nearestInsertion(
  items: { rect: DropRect; index: number }[], point: DropPoint, layout: DropLayout,
): { index: number; hint: LayoutHint } | null {
  // Distance to the rectangle (not its center) keeps wrapped rows and unequal
  // grid cells stable. Array indices remain logical, even in reversed layouts.
  const distance = (rect: DropRect) => Math.hypot(
    Math.max(rect.left - point.x, 0, point.x - rect.left - rect.width),
    Math.max(rect.top - point.y, 0, point.y - rect.top - rect.height),
  );
  const nearest = [...items].sort((a, b) => distance(a.rect) - distance(b.rect))[0];
  if (!nearest) return null;
  const betweenGridRows = layout.mode === "grid" && layout.axis === "x" &&
    (point.y < nearest.rect.top || point.y > nearest.rect.top + nearest.rect.height);
  const result = resolveLayoutDrop({ rect: nearest.rect, point, layout: betweenGridRows ? verticalLayout : layout });
  return { index: nearest.index + (result.edge === "after" ? 1 : 0), hint: result.hint };
}

export function layoutParent(node: HTMLElement): HTMLElement | null {
  const view = node.ownerDocument.defaultView;
  let parent = node.parentElement;
  while (parent && view) {
    const style = view.getComputedStyle(parent);
    if (style.display.includes("flex") || style.display.includes("grid")) return parent;
    // Runtime layout wrappers and display:contents wrappers aren't the slot.
    if (parent.hasAttribute("data-editor-node") || parent.hasAttribute("data-editor-canvas")) return parent;
    parent = parent.parentElement;
  }
  return null;
}

export function measuredLayout(node: HTMLElement | null): DropLayout {
  const parent = node && layoutParent(node);
  return parent?.ownerDocument.defaultView
    ? layoutFromStyle(parent.ownerDocument.defaultView.getComputedStyle(parent))
    : verticalLayout;
}
