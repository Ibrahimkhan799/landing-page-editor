import type { PageElement, PageSection, SlotDefinition, SlotValue, SectionType } from "@/lib/types";

export const SECTION_SLOTS: Record<SectionType, SlotDefinition[]> = {
  navbar: [
    { id: "links", label: "Links", kind: "text" },
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
    { id: "media", label: "Media", kind: "element", accept: ["image", "video"] },
    { id: "actions", label: "Actions", kind: "elements", accept: ["button"] },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  logos: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "logos", label: "Logos", kind: "text" },
  ],
  features: [
    { id: "headline", label: "Headline", kind: "text" },
    { id: "subheadline", label: "Subheadline", kind: "text" },
    { id: "extra", label: "Extra elements", kind: "elements" },
  ],
  about: [
    { id: "eyebrow", label: "Eyebrow", kind: "text" },
    { id: "headline", label: "Headline", kind: "text" },
    { id: "body", label: "Body", kind: "text" },
    { id: "media", label: "Media", kind: "element", accept: ["image", "video"] },
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
    { id: "links", label: "Links", kind: "text" },
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

export function allSectionElements(section: PageSection): { slotId: string; element: PageElement }[] {
  const found: { slotId: string; element: PageElement }[] = [];
  for (const def of slotDefs(section.type)) {
    if (def.kind === "element") {
      const element = elementSlot(section, def.id);
      if (element) found.push({ slotId: def.id, element });
    }
    if (def.kind === "elements") {
      for (const element of elementsSlot(section, def.id)) {
        found.push({ slotId: def.id, element });
      }
    }
  }
  return found;
}

export function findElement(
  section: PageSection,
  elementId: string,
): { slotId: string; element: PageElement } | null {
  return allSectionElements(section).find((item) => item.element.id === elementId) ?? null;
}

export function setSlot(section: PageSection, slotId: string, value: SlotValue): PageSection {
  return { ...section, slots: { ...section.slots, [slotId]: value } };
}

export function defaultElementsSlot(section: PageSection) {
  const extra = slotDefs(section.type).find((slot) => slot.kind === "elements");
  return extra?.id ?? "extra";
}
