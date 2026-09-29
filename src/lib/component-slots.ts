import { cloneElementNodes } from "@/lib/defaults";
import { expressionText } from "@/lib/expressions";
import { resolveVariablePath } from "@/lib/variables";
import type { PageElement, PageSection, SlotValue } from "@/lib/types";

function walkElements(elements: PageElement[], visit: (el: PageElement) => PageElement): PageElement[] {
  return elements.map((el) => {
    const next = visit(el);
    if (next.children?.length) {
      return { ...next, children: walkElements(next.children, visit) };
    }
    return next;
  });
}

function mapSlotTree(slots: PageSection["slots"], visit: (el: PageElement) => PageElement): PageSection["slots"] {
  if (!slots) return slots;
  const next: NonNullable<PageSection["slots"]> = {};
  for (const [key, value] of Object.entries(slots)) {
    if (Array.isArray(value)) next[key] = walkElements(value, visit);
    else if (value && typeof value === "object" && "type" in value) {
      const el = visit(value as PageElement);
      next[key] = el.children?.length ? { ...el, children: walkElements(el.children, visit) } : el;
    } else next[key] = value;
  }
  return next;
}

/** Apply instance slotOverrides onto element props / slot children. */
export function applySlotOverrides(section: PageSection): PageSection {
  const overrides = section.slotOverrides;
  if (!overrides || !Object.keys(overrides).length) return section;

  const visit = (el: PageElement): PageElement => {
    let next = el;
    if (el.textSlot && overrides[el.textSlot.id] !== undefined) {
      const value = overrides[el.textSlot.id];
      if (typeof value === "string") {
        next = { ...next, props: { ...next.props, [el.textSlot.prop]: value } };
      }
    }
    if (el.type === "slot") {
      const name = typeof el.props.name === "string" ? el.props.name : el.id;
      const override = overrides[name] ?? overrides[el.id];
      if (Array.isArray(override)) {
        next = { ...next, children: cloneElementNodes(override, { namespace: `slot:${section.id}:${el.id}`, preserveStyleSource: true }) };
      } else if (override && typeof override === "object" && "type" in override) {
        next = { ...next, children: cloneElementNodes([override as PageElement], { namespace: `slot:${section.id}:${el.id}`, preserveStyleSource: true }) };
      }
    }
    return next;
  };

  return {
    ...section,
    slots: mapSlotTree(section.slots, visit),
    elements: section.elements ? walkElements(section.elements, visit) : undefined,
  };
}

/** Collect text/slot values from a section into slotOverrides (for preserving on sync). */
export function collectSlotOverrides(section: PageSection): Record<string, SlotValue> {
  const out: Record<string, SlotValue> = { ...(section.slotOverrides ?? {}) };

  const visit = (el: PageElement) => {
    if (el.textSlot) {
      const value = el.props[el.textSlot.prop];
      if (typeof value === "string") out[el.textSlot.id] = value;
    }
    if (el.type === "slot") {
      const name = typeof el.props.name === "string" ? el.props.name : el.id;
      out[name] = el.children ?? [];
    }
    el.children?.forEach(visit);
  };

  for (const value of Object.values(section.slots ?? {})) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object" && "type" in value) visit(value as PageElement);
  }
  return out;
}

export function listItemValues(item: unknown, index: number): Record<string, unknown> {
  return { ...(item && typeof item === "object" && !Array.isArray(item) ? item : {}), item, index: index + 1 };
}

export function bindTemplateText(text: string, item: unknown, index: number) {
  const values = listItemValues(item, index);
  return text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (token, path: string) => {
    const value = resolveVariablePath(values, path);
    return value === undefined ? token : expressionText(value);
  });
}

/** Stable keyed rows survive reordering; duplicate keys are disambiguated by occurrence. Unkeyed rows use their index. */
export function listItemKey(items: unknown[], index: number): string {
  const keyFor = (item: unknown) => {
    if (!item || typeof item !== "object") return undefined;
    const record = item as Record<string, unknown>;
    const key = record.id ?? record.key;
    return typeof key === "string" || typeof key === "number" ? `${typeof key}:${key}` : undefined;
  };
  const key = keyFor(items[index]);
  return key === undefined ? `index:${index}` : `key:${JSON.stringify([key, items.slice(0, index).filter((item) => keyFor(item) === key).length])}`;
}

export function bindElementsToItem(
  elements: PageElement[], item: unknown, index: number, namespace: string, interpolate = false,
): PageElement[] {
  const clones = cloneElementNodes(elements, { namespace, preserveStyleSource: true });
  const bind = (element: PageElement): PageElement => ({
    ...element,
    props: Object.fromEntries(Object.entries(element.props).map(([key, value]) => [
      key, typeof value === "string" ? bindTemplateText(value, item, index) : value,
    ])),
    // A nested list introduces a new item scope; do not consume its template tokens here.
    children: element.type === "list" ? element.children : element.children?.map(bind),
  });
  return interpolate ? clones.map(bind) : clones;
}

export function bindElementToItem(element: PageElement, item: unknown, index: number): PageElement {
  return bindElementsToItem([element], item, index, `repeat:${index}`, true)[0];
}
