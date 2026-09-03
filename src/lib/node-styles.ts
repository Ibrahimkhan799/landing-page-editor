import { allSectionElements } from "@/lib/slots";
import { styleToCss } from "@/lib/styles";
import type {
  BoxEdges,
  Breakpoint,
  InteractionState,
  LandingPage,
  NodeMeta,
  PageSection,
  StyleProps,
} from "@/lib/types";

export function cloneStyleProps(styles?: StyleProps): StyleProps {
  if (!styles) return {};
  return {
    ...styles,
    padding: styles.padding ? { ...styles.padding } : undefined,
    margin: styles.margin ? { ...styles.margin } : undefined,
  };
}

export function cloneNodeMeta<T extends NodeMeta>(
  node: T,
): Pick<T, "className" | "htmlId" | "styles" | "responsive" | "states" | "animation"> {
  return {
    className: node.className,
    htmlId: node.htmlId,
    styles: cloneStyleProps(node.styles),
    responsive: node.responsive
      ? {
          tablet: cloneStyleProps(node.responsive.tablet),
          mobile: cloneStyleProps(node.responsive.mobile),
        }
      : undefined,
    states: node.states
      ? {
          hover: cloneStyleProps(node.states.hover),
          focus: cloneStyleProps(node.states.focus),
          disabled: cloneStyleProps(node.states.disabled),
        }
      : undefined,
    animation: node.animation ? { ...node.animation } : node.animation,
  };
}

export function mergeStyles(...parts: (StyleProps | undefined)[]): StyleProps {
  const out: StyleProps = {};
  for (const part of parts) {
    if (!part) continue;
    for (const key of Object.keys(part) as (keyof StyleProps)[]) {
      const value = part[key];
      if (value === undefined) continue;
      if (key === "padding" || key === "margin") {
        const box = value as Partial<BoxEdges>;
        const current = (out[key] ?? {}) as Partial<BoxEdges>;
        out[key] = { ...current, ...box };
        continue;
      }
      if (value === "") {
        delete out[key];
        continue;
      }
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export function resolveNodeStyles(
  node: NodeMeta,
  breakpoint: Breakpoint = "desktop",
  state: InteractionState = "default",
): StyleProps {
  const layers: (StyleProps | undefined)[] = [node.styles];
  if (breakpoint === "tablet" || breakpoint === "mobile") layers.push(node.responsive?.tablet);
  if (breakpoint === "mobile") layers.push(node.responsive?.mobile);
  if (state !== "default") layers.push(node.states?.[state]);
  return mergeStyles(...layers);
}

export function editingBucket(
  node: NodeMeta,
  breakpoint: Breakpoint,
  state: InteractionState,
): StyleProps {
  if (state !== "default") return node.states?.[state] ?? {};
  if (breakpoint === "tablet") return node.responsive?.tablet ?? {};
  if (breakpoint === "mobile") return node.responsive?.mobile ?? {};
  return node.styles ?? {};
}

export function applyStyleBucket(
  node: NodeMeta,
  styles: StyleProps,
  breakpoint: Breakpoint,
  state: InteractionState,
): NodeMeta {
  if (state !== "default") {
    return { ...node, states: { ...node.states, [state]: styles } };
  }
  if (breakpoint === "tablet" || breakpoint === "mobile") {
    return { ...node, responsive: { ...node.responsive, [breakpoint]: styles } };
  }
  return { ...node, styles };
}

function camelToKebab(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function stylePropsToCssText(styles?: StyleProps, important = false): string {
  const css = styleToCss(styles);
  return Object.entries(css)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${camelToKebab(key)}: ${value}${important ? " !important" : ""};`)
    .join(" ");
}

export function collectStyledNodes(page: LandingPage | { sections: PageSection[] }): Array<NodeMeta & { id: string }> {
  const nodes: Array<NodeMeta & { id: string }> = [];
  for (const section of page.sections) {
    nodes.push(section);
    for (const { element } of allSectionElements(section)) nodes.push(element);
  }
  return nodes;
}

export function nodeStylesheet(nodes: Array<NodeMeta & { id: string }>): string {
  const rules: string[] = [];
  for (const node of nodes) {
    const selector = `[data-editor-node="${node.id}"]`;
    const tablet = stylePropsToCssText(node.responsive?.tablet);
    const mobile = stylePropsToCssText(node.responsive?.mobile);
    if (tablet) rules.push(`@media (max-width: 1023px) { ${selector} { ${tablet} } }`);
    if (mobile) rules.push(`@media (max-width: 639px) { ${selector} { ${mobile} } }`);
    const hover = stylePropsToCssText(node.states?.hover, true);
    const focus = stylePropsToCssText(node.states?.focus, true);
    const disabled = stylePropsToCssText(node.states?.disabled, true);
    if (hover) rules.push(`${selector}:hover, ${selector}[data-preview-state="hover"] { ${hover} }`);
    if (focus) {
      rules.push(
        `${selector}:focus, ${selector}:focus-visible, ${selector}[data-preview-state="focus"] { ${focus} }`,
      );
    }
    if (disabled) {
      rules.push(
        `${selector}:disabled, ${selector}[aria-disabled="true"], ${selector}[data-preview-state="disabled"] { ${disabled} }`,
      );
    }
  }
  return rules.join("\n");
}

export function alignStylePatch(kind: "left" | "center" | "right" | "top" | "middle" | "bottom"): StyleProps {
  switch (kind) {
    case "left":
      return { alignSelf: "flex-start", textAlign: "left", margin: { left: "0px", right: "auto" } };
    case "center":
      return { alignSelf: "center", textAlign: "center", margin: { left: "auto", right: "auto" } };
    case "right":
      return { alignSelf: "flex-end", textAlign: "right", margin: { left: "auto", right: "0px" } };
    case "top":
      return { alignSelf: "flex-start", margin: { top: "0px", bottom: "auto" } };
    case "middle":
      return { alignSelf: "center", margin: { top: "auto", bottom: "auto" } };
    case "bottom":
      return { alignSelf: "flex-end", margin: { top: "auto", bottom: "0px" } };
  }
}
