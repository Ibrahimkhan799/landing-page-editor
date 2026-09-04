import { cloneElementNode } from "@/lib/defaults";
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
        next = { ...next, children: override.map(cloneElementNode) };
      } else if (override && typeof override === "object" && "type" in override) {
        next = { ...next, children: [cloneElementNode(override as PageElement)] };
      }
    }
    return next;
  };

  return {
    ...section,
    slots: mapSlotTree(section.slots, visit),
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

export function bindTemplateText(text: string, item: Record<string, unknown>, index: number) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key === "index") return String(index + 1);
    const value = item[key];
    return value == null ? "" : String(value);
  });
}

export function bindElementToItem(element: PageElement, item: Record<string, unknown>, index: number): PageElement {
  const props = { ...element.props };
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string") props[key] = bindTemplateText(value, item, index);
  }
  return {
    ...element,
    id: `${element.id}-${index}`,
    props,
    children: element.children?.map((child) => bindElementToItem(child, item, index)),
  };
}
