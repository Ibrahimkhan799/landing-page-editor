import { nanoid } from "nanoid";
import { defaultElementsSlot, slotDefs } from "@/lib/slots";
import type { ElementType, LandingPage, PageElement, PageSection, SlotValue } from "@/lib/types";

function makeElement(type: ElementType, props: Record<string, unknown> = {}): PageElement {
  return {
    id: nanoid(10),
    type,
    props,
    className: "",
    htmlId: "",
    styles: {},
    children: type === "frame" ? [] : undefined,
  };
}

function asElement(value: unknown): PageElement | null {
  if (value && typeof value === "object" && !Array.isArray(value) && "type" in value && "id" in value) {
    return value as PageElement;
  }
  return null;
}

export function migrateSection(section: PageSection): PageSection {
  const slots: Record<string, SlotValue> = { ...(section.slots ?? {}) };
  const props = { ...section.props };
  const legacyElements = section.elements ?? [];

  for (const def of slotDefs(section.type)) {
    if (slots[def.id] !== undefined) continue;
    if (def.kind === "text") {
      const fromProp = props[def.id];
      slots[def.id] = typeof fromProp === "string" ? fromProp : "";
      if (typeof fromProp === "string") delete props[def.id];
      continue;
    }
    if (def.kind === "element") {
      slots[def.id] = null;
      continue;
    }
    slots[def.id] = [];
  }

  if (legacyElements.length) {
    const target = defaultElementsSlot(section);
    const current = Array.isArray(slots[target]) ? (slots[target] as PageElement[]) : [];
    slots[target] = [...current, ...legacyElements];
  }

  if (section.type === "navbar" && !asElement(slots.cta)) {
    slots.cta = makeElement("button", {
      label: typeof props.ctaLabel === "string" ? props.ctaLabel : "Book a call",
      href: typeof props.ctaHref === "string" ? props.ctaHref : "#contact",
    });
    delete props.ctaLabel;
    delete props.ctaHref;
  }

  if ((section.type === "hero" || section.type === "hero-split") && !(slots.actions as PageElement[])?.length) {
    const actions: PageElement[] = [];
    if (typeof props.primaryCta === "string") {
      actions.push(
        makeElement("button", {
          label: props.primaryCta,
          href: typeof props.primaryHref === "string" ? props.primaryHref : "#contact",
        }),
      );
    }
    if (typeof props.secondaryCta === "string") {
      actions.push(
        makeElement("button", {
          label: props.secondaryCta,
          href: typeof props.secondaryHref === "string" ? props.secondaryHref : "#",
          variant: "outline",
        }),
      );
    }
    slots.actions = actions;
    delete props.primaryCta;
    delete props.primaryHref;
    delete props.secondaryCta;
    delete props.secondaryHref;
  }

  if (section.type === "hero-split" && !asElement(slots.media) && typeof props.image === "string") {
    slots.media = makeElement("image", { src: props.image, alt: "Hero image" });
    delete props.image;
  }

  if (section.type === "about" && !asElement(slots.media) && typeof props.image === "string") {
    slots.media = makeElement("image", { src: props.image, alt: "About image" });
    delete props.image;
  }

  if (section.type === "about") {
    if (typeof slots.body === "string") {
      const text = slots.body.trim();
      slots.body = text ? [makeElement("paragraph", { text })] : [];
    } else if (!Array.isArray(slots.body)) {
      const text = typeof props.body === "string" ? props.body.trim() : "";
      slots.body = text ? [makeElement("paragraph", { text })] : [];
      delete props.body;
    }
  }

  if (section.type === "cta" && !asElement(slots.action)) {
    slots.action = makeElement("button", {
      label: typeof props.ctaLabel === "string" ? props.ctaLabel : "Get started",
      href: typeof props.ctaHref === "string" ? props.ctaHref : "/admin",
      variant: "primary",
    });
    delete props.ctaLabel;
    delete props.ctaHref;
  }

  if (section.type === "contact" && !(slots.form as PageElement[])?.length && legacyElements.length) {
    slots.form = legacyElements;
  }

  if (section.type === "custom" && !(slots.body as PageElement[])?.length) {
    slots.body = legacyElements;
  }

  for (const key of Object.keys(slots)) {
    if (key.startsWith("frame:")) delete slots[key];
  }

  return {
    ...section,
    props,
    slots,
    elements: undefined,
    className: section.className ?? "",
    htmlId: section.htmlId ?? "",
    styles: section.styles ?? {},
  };
}

export function migratePage(page: LandingPage): LandingPage {
  return {
    ...page,
    sections: page.sections.map(migrateSection),
  };
}
