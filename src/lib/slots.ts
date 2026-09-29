import type { PageElement, PageSection, SlotDefinition, SlotValue, SectionType } from "@/lib/types";

export const SECTION_SLOTS: Record<SectionType, SlotDefinition[]> = {
  navbar: [
    { id: "links", label: "Links", kind: "elements", accept: ["button", "badge"] },
    { id: "cta", label: "CTA button", kind: "element", accept: ["button"] },
  ],
  hero: [
    { id: "eyebrow", label: "Eyebrow", kind: "text" },
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "actions", label: "Actions", kind: "elements", accept: ["button", "badge"] },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  "hero-split": [
    { id: "eyebrow", label: "Eyebrow", kind: "text" },
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "media", label: "Media", kind: "element", accept: ["image", "video", "svg"] },
    { id: "actions", label: "Actions", kind: "elements", accept: ["button"] },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  logos: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "logos", label: "Logos", kind: "elements", accept: ["badge", "button", "image"] },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  features: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  about: [
    { id: "eyebrow", label: "Eyebrow", kind: "text" },
    { id: "headline", label: "Headline", kind: "text" },
    { id: "body", label: "Body", kind: "elements" },
    { id: "media", label: "Media", kind: "element", accept: ["image", "video", "svg"] },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  stats: [{ id: "extra", label: "Extra elements", kind: "elements" }],
  services: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  testimonials: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  pricing: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  faq: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  gallery: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "images", label: "Images", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  team: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  cta: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "action", label: "Action", kind: "element", accept: ["button"] },
  ],
  contact: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "form", label: "Form fields", kind: "elements" },
  ],
  footer: [
    { id: "blurb", label: "Blurb", kind: "text" },
    { id: "links", label: "Links", kind: "elements", accept: ["button", "badge"] },
    { id: "copyright", label: "Copyright", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  custom: [{ id: "body", label: "Body", kind: "elements" }],
};

export function slotDefs(type: SectionType) {
  return SECTION_SLOTS[type] ?? [];
}

export function textSlot(section: PageSection, id: string, fallback = "") {
  const value = section.slots?.[id];
  return typeof value === "string" ? value : fallback;
}

export function elementSlot(section: PageSection, id: string): PageElement | null {
  const value = section.slots?.[id];
  if (value && typeof value === "object" && !Array.isArray(value) && "type" in value) {
    return value as PageElement;
  }
  return null;
}

export function elementsSlot(section: PageSection, id: string): PageElement[] {
  const value = section.slots?.[id];
  if (Array.isArray(value)) return value;
  return [];
}

export function allSectionElements(section: PageSection): { slotId: string; element: PageElement; parentId?: string }[] {
  const found: { slotId: string; element: PageElement; parentId?: string }[] = [];

  function walk(elements: PageElement[], slotId: string, parentId?: string) {
    for (const element of elements) {
      found.push({ slotId, element, parentId });
      if (element.children?.length) walk(element.children, frameSlotId(element.id), element.id);
    }
  }

  for (const def of slotDefs(section.type)) {
    if (def.kind === "element") {
      const element = elementSlot(section, def.id);
      if (element) walk([element], def.id);
    }
    if (def.kind === "elements") walk(elementsSlot(section, def.id), def.id);
  }
  return found;
}

export function frameSlotId(parentId: string) {
  return `frame:${parentId}`;
}

export function parseFrameSlotId(slotId: string) {
  if (!slotId.startsWith("frame:")) return null;
  return slotId.slice("frame:".length);
}

export function isContainerElement(type: string | undefined) {
  return type === "frame" || type === "slot" || type === "list" || type === "conditional";
}

/** Built-in catalog sections are fixed components — not user-savable templates. */
export function isBuiltInSectionType(type: string | undefined) {
  return Boolean(type && type !== "custom");
}

/** On page instances of a saved component, only slots (and their contents) are editable. */
export function isInstanceSlotEditable(
  section: PageSection | null | undefined,
  element: PageElement,
  ancestors: PageElement[] = [],
) {
  if (!section?.componentId) return true;
  if (element.type === "slot") return true;
  if (element.textSlot) return true;
  if (ancestors.some((node) => node.type === "slot")) return true;
  return false;
}

export function elementContains(element: PageElement, elementId: string): boolean {
  return element.id === elementId || Boolean(element.children?.some((child) => elementContains(child, elementId)));
}

export function findElementWithAncestors(
  section: PageSection,
  elementId: string,
): { element: PageElement; ancestors: PageElement[] } | null {
  function walk(elements: PageElement[], ancestors: PageElement[]): { element: PageElement; ancestors: PageElement[] } | null {
    for (const element of elements) {
      if (element.id === elementId) return { element, ancestors };
      const nested = element.children?.length ? walk(element.children, [...ancestors, element]) : null;
      if (nested) return nested;
    }
    return null;
  }

  for (const def of slotDefs(section.type)) {
    if (def.kind === "element") {
      const element = elementSlot(section, def.id);
      if (element) {
        const found = walk([element], []);
        if (found) return found;
      }
    }
    if (def.kind === "elements") {
      const found = walk(elementsSlot(section, def.id), []);
      if (found) return found;
    }
  }
  return null;
}

export function isElementEditableInInstance(section: PageSection, elementId: string) {
  if (!section.componentId) return true;
  const found = findElementWithAncestors(section, elementId);
  return Boolean(found && isInstanceSlotEditable(section, found.element, found.ancestors));
}

export function isSlotEditableInInstance(section: PageSection, slotId: string) {
  if (!section.componentId) return true;
  const parentId = parseFrameSlotId(slotId);
  if (!parentId) return false;
  const found = findElementWithAncestors(section, parentId);
  // Exposing a text prop does not expose that node's child structure.
  return Boolean(found && (found.element.type === "slot" || found.ancestors.some((node) => node.type === "slot")));
}

export type ElementPlacementIssue = "cycle" | "invalid-type" | "locked" | "missing-target" | "occupied" | "branch-scaffold";

/** Branches are ordinary frames; only their position under an IF is structural. */
export function conditionalBranch(element: PageElement, parent?: PageElement): "then" | "else" | null {
  if (parent?.type !== "conditional" || element.type !== "frame") return null;
  return element.props.branch === "then" || element.props.branch === "else" ? element.props.branch : null;
}

/** Structural edits need permission on the parent, not just an overridable text prop. */
export function getElementStructureIssue(
  section: PageSection,
  elementId: string,
  options?: { allowComponentRoot?: boolean },
): ElementPlacementIssue | null {
  const found = findElement(section, elementId);
  if (!found) return "missing-target";
  const parent = found.parentId ? findElement(section, found.parentId)?.element : undefined;
  if (conditionalBranch(found.element, parent)) return "branch-scaffold";
  if (!options?.allowComponentRoot &&
    (!isElementEditableInInstance(section, elementId) || !isSlotEditableInInstance(section, found.slotId))) {
    return "locked";
  }
  return null;
}

export function getElementPlacementIssue(
  section: PageSection,
  slotId: string,
  element: PageElement,
  options?: { allowComponentRoot?: boolean },
): ElementPlacementIssue | null {
  if (!options?.allowComponentRoot && !isSlotEditableInInstance(section, slotId)) return "locked";

  const parentId = parseFrameSlotId(slotId);
  if (parentId) {
    const parent = findElement(section, parentId)?.element;
    if (!parent || !isContainerElement(parent.type)) return "missing-target";
    if (elementContains(element, parentId)) return "cycle";
    // Insert into the Then/Else frame, never alongside the branch scaffold.
    if (parent.type === "conditional") return "branch-scaffold";
    return null;
  }

  const def = slotDefs(section.type).find((slot) => slot.id === slotId);
  if (!def || def.kind === "text") return "missing-target";
  if (def.accept?.length && !def.accept.includes(element.type)) return "invalid-type";
  if (def.kind === "element") {
    const existing = elementSlot(section, slotId);
    if (existing && existing.id !== element.id) return "occupied";
  }
  return null;
}

/** Prefer full-bleed when width is percentage/fill or the node is a container. */
export function wantsFullWidth(element: PageElement) {
  if (isContainerElement(element.type)) return true;
  const width = element.styles?.width?.trim();
  if (!width) return false;
  return width.endsWith("%") || width === "fill" || width === "stretch" || width === "100";
}

export function findElement(
  section: PageSection,
  elementId: string,
): { slotId: string; element: PageElement; parentId?: string } | null {
  return allSectionElements(section).find((item) => item.element.id === elementId) ?? null;
}

/** Resolve a real section slot or a container's virtual frame:<id> slot. */
export function slotElements(section: PageSection, slotId: string): PageElement[] {
  const parentId = parseFrameSlotId(slotId);
  if (parentId) return findElement(section, parentId)?.element.children ?? [];
  const value = section.slots?.[slotId];
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

/** Update nested children without ever materializing a virtual slot in section.slots. */
export function replaceSlotElements(section: PageSection, slotId: string, elements: PageElement[]): PageSection {
  const parentId = parseFrameSlotId(slotId);
  if (!parentId) {
    const def = slotDefs(section.type).find((slot) => slot.id === slotId);
    if (!def || def.kind === "text" || (def.kind === "element" && elements.length > 1)) return section;
    return setSlot(section, slotId, def.kind === "element" ? elements[0] ?? null : elements);
  }
  const parent = findElement(section, parentId)?.element;
  if (!parent || !isContainerElement(parent.type)) return section;
  function replace(node: PageElement): PageElement {
    if (node.id === parentId) return { ...node, children: elements };
    if (!node.children?.length) return node;
    return { ...node, children: node.children.map(replace) };
  }
  const slots = { ...section.slots };
  for (const def of slotDefs(section.type)) {
    const value = slots[def.id];
    if (Array.isArray(value)) slots[def.id] = value.map(replace);
    else if (value && typeof value === "object") slots[def.id] = replace(value);
  }
  return { ...section, slots };
}

export function setSlot(section: PageSection, slotId: string, value: SlotValue): PageSection {
  return { ...section, slots: { ...section.slots, [slotId]: value } };
}

export function defaultElementsSlot(section: PageSection) {
  const extra = slotDefs(section.type).find((slot) => slot.kind === "elements");
  return extra?.id ?? "extra";
}
